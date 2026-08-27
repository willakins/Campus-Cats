import React from 'react';

import { render, screen, userEvent } from '@testing-library/react-native';

import ViewAnnouncement from '../../app/(app)/announcements/view-ann';
import { Role, parseAnnouncement, parseUser } from '../../core/domain';
import { AppThemeProvider } from '../../theme';

const mockPush = jest.fn();
const mockGet = jest.fn();
const mockMedia = jest.fn();
const mockMarkRead = jest.fn();
let mockRole: Role = Role.Officer;

jest.mock('expo-router', () => {
  const mockReact = require('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) =>
      mockReact.useEffect(effect, [effect]),
    useLocalSearchParams: () => ({ id: 'announcement-1' }),
    useRouter: () => ({ back: jest.fn(), push: mockPush }),
  };
});

jest.mock('../../composition/appModules', () => ({
  appModules: {
    announcements: {
      get: (...args: unknown[]) => mockGet(...args),
      media: (...args: unknown[]) => mockMedia(...args),
      markRead: (...args: unknown[]) => mockMarkRead(...args),
    },
  },
}));

jest.mock('../../providers', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', email: 'admin@gatech.edu', role: mockRole },
  }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('../../components/entries/AnnouncementEntry', () => {
  const mockReact = require('react');
  const { Text: MockText } = require('react-native');
  return {
    AnnouncementEntry: ({
      announcement,
    }: {
      announcement: { title: string };
    }) => mockReact.createElement(MockText, null, announcement.title),
  };
});

const renderAnnouncement = async () =>
  await render(
    <AppThemeProvider colorScheme="light">
      <ViewAnnouncement />
    </AppThemeProvider>,
  );

const announcement = parseAnnouncement({
  id: 'announcement-1',
  title: 'Feeding station workday',
  info: 'Meet at noon.',
  createdAt: new Date('2025-04-15T12:00:00.000Z'),
  createdBy: parseUser({
    id: 'admin-1',
    email: 'admin@gatech.edu',
    role: Role.Officer,
  }),
  authorAlias: 'Campus Cats Team',
});

describe('view announcement route', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockRole = Role.Officer;
    mockGet.mockResolvedValue({ ok: true, value: announcement, warnings: [] });
    mockMedia.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockMarkRead.mockReset();
    mockMarkRead.mockResolvedValue({
      ok: true,
      value: undefined,
      warnings: [],
    });
  });

  it('renders the page header and detail geometry before data resolves', async () => {
    mockGet.mockImplementation(() => new Promise(() => undefined));
    await renderAnnouncement();

    expect(screen.getByText('Announcement')).toBeOnTheScreen();
    expect(
      screen.getByRole('progressbar', { name: 'Loading announcement' }),
    ).toBeOnTheScreen();
  });

  it('loads by route ID and passes that ID to the editor', async () => {
    const user = userEvent.setup();
    await renderAnnouncement();

    expect(
      await screen.findByText('Feeding station workday'),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Edit announcement' }));
    expect(mockGet).toHaveBeenCalledWith('announcement-1');
    expect(mockMarkRead).toHaveBeenCalledWith(
      { id: 'admin-1', email: 'admin@gatech.edu', role: Role.Officer },
      'announcement-1',
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/announcements/edit-ann',
      params: { id: 'announcement-1' },
    });
  });

  it('does not offer editing to members', async () => {
    mockRole = Role.Member;
    await renderAnnouncement();

    expect(
      await screen.findByText('Feeding station workday'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Edit announcement' }),
    ).not.toBeOnTheScreen();
  });

  it('renders a module error instead of a selected global record', async () => {
    mockGet.mockResolvedValue({
      ok: false,
      error: { code: 'not_found', message: 'Announcement not found' },
    });
    await renderAnnouncement();

    expect(await screen.findByText('Announcement not found')).toBeOnTheScreen();
  });
});
