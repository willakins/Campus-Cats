import React from 'react';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import Announcements from '../../app/(app)/(tabs)/announcements';
import { Role, parseAnnouncement, parseUser } from '../../core/domain';
import { AppThemeProvider } from '../../theme';

const mockList = jest.fn();
const mockPush = jest.fn();
let mockRole: Role = Role.Officer;

jest.mock('expo-router', () => {
  const mockReact = require('react');
  return {
    router: { push: (...args: unknown[]) => mockPush(...args) },
    useFocusEffect: (effect: () => void | (() => void)) =>
      mockReact.useEffect(effect, [effect]),
  };
});

jest.mock('../../composition/appModules', () => ({
  appModules: {
    announcements: { list: (...args: unknown[]) => mockList(...args) },
  },
}));

jest.mock('../../providers', () => ({
  useAuth: () => ({
    user: { id: 'actor-1', email: 'actor@gatech.edu', role: mockRole },
  }),
}));

jest.mock('../../components/items/AnnouncementItem', () => {
  const mockReact = require('react');
  const { Text: MockText } = require('react-native');
  return {
    AnnouncementItem: ({ title }: { title: string }) =>
      mockReact.createElement(MockText, null, title),
  };
});

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const renderAnnouncements = async () =>
  await render(
    <AppThemeProvider colorScheme="light">
      <Announcements />
    </AppThemeProvider>,
  );

const announcement = parseAnnouncement({
  id: 'announcement-1',
  title: 'Volunteer workday',
  info: 'Meet at noon.',
  createdAt: new Date('2025-04-15T12:00:00.000Z'),
  createdBy: parseUser({
    id: 'admin-1',
    email: 'admin@gatech.edu',
    role: Role.Officer,
  }),
  authorAlias: 'Campus Cats',
});

describe('announcements list route', () => {
  beforeEach(() => {
    mockList.mockReset();
    mockPush.mockReset();
    mockRole = Role.Officer;
  });

  it('renders an empty result and limits creation to administrators', async () => {
    mockList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    const { rerender } = await renderAnnouncements();

    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(screen.getByText('Announcements')).toBeOnTheScreen();
    expect(screen.getByText('Announcement access')).toBeOnTheScreen();
    expect(screen.getByText('No announcements yet')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Create announcement' })).toBeOnTheScreen();

    mockRole = Role.Member;
    await rerender(
      <AppThemeProvider colorScheme="light">
        <Announcements />
      </AppThemeProvider>,
    );
    expect(screen.queryByRole('button', { name: 'Create announcement' })).not.toBeOnTheScreen();
    expect(
      screen.getByText('Everyone can read club updates. Only officers can publish or edit announcements.'),
    ).toBeOnTheScreen();
  });

  it('renders successful results and module errors', async () => {
    mockList.mockResolvedValue({ ok: true, value: [announcement], warnings: [] });
    const { unmount } = await renderAnnouncements();
    expect(await screen.findByText('Volunteer workday')).toBeOnTheScreen();
    await unmount();

    mockList.mockResolvedValue({
      ok: false,
      error: { code: 'dependency_failure', message: 'Could not load announcements' },
    });
    await renderAnnouncements();
    expect(await screen.findByText('Could not load announcements')).toBeOnTheScreen();
  });

  it('keeps stable loading geometry and routes the authorized create action', async () => {
    let finish: ((value: unknown) => void) | undefined;
    mockList.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const user = userEvent.setup();
    await renderAnnouncements();

    expect(screen.getByText('Announcements')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar', { name: 'Loading announcements' })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Create announcement' }));
    expect(mockPush).toHaveBeenCalledWith('/announcements/create-ann');
    finish?.({ ok: true, value: [], warnings: [] });
    expect(await screen.findByText('No announcements yet')).toBeOnTheScreen();
  });
});
