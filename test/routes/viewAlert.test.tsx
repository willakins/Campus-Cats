import React from 'react';

import { render, screen, userEvent } from '@testing-library/react-native';

import ViewAlert from '../../app/(app)/community/alerts/[id]';
import { Role, parseAlert, parseUser } from '../../core/domain';
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
    useLocalSearchParams: () => ({ id: 'alert-1' }),
    useRouter: () => ({ back: jest.fn(), push: mockPush }),
  };
});

jest.mock('../../composition/appModules', () => ({
  appModules: {
    alerts: {
      get: (...args: unknown[]) => mockGet(...args),
      media: (...args: unknown[]) => mockMedia(...args),
      markRead: (...args: unknown[]) => mockMarkRead(...args),
    },
  },
}));

jest.mock('../../presentation/providers', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', email: 'admin@gatech.edu', role: mockRole },
  }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('../../presentation/screens/community/alerts/components/AlertDetailsContent', () => {
  const mockReact = require('react');
  const { Text: MockText } = require('react-native');
  return {
    AlertDetailsContent: ({
      alert,
    }: {
      alert: { title: string };
    }) => mockReact.createElement(MockText, null, alert.title),
  };
});

const renderAlert = async () =>
  await render(
    <AppThemeProvider colorScheme="light">
      <ViewAlert />
    </AppThemeProvider>,
  );

const alert = parseAlert({
  id: 'alert-1',
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

describe('view alert route', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockRole = Role.Officer;
    mockGet.mockResolvedValue({ ok: true, value: alert, warnings: [] });
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
    await renderAlert();

    expect(screen.getByText('Alert')).toBeOnTheScreen();
    expect(
      screen.getByRole('progressbar', { name: 'Loading alert' }),
    ).toBeOnTheScreen();
  });

  it('loads by route ID and passes that ID to the editor', async () => {
    const user = userEvent.setup();
    await renderAlert();

    expect(
      await screen.findByText('Feeding station workday'),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Edit alert' }));
    expect(mockGet).toHaveBeenCalledWith('alert-1');
    expect(mockMarkRead).toHaveBeenCalledWith(
      { id: 'admin-1', email: 'admin@gatech.edu', role: Role.Officer },
      'alert-1',
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/community/alerts/[id]/edit',
      params: { id: 'alert-1' },
    });
  });

  it('does not offer editing to members', async () => {
    mockRole = Role.Member;
    await renderAlert();

    expect(
      await screen.findByText('Feeding station workday'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Edit alert' }),
    ).not.toBeOnTheScreen();
  });

  it('renders a module error instead of a selected global record', async () => {
    mockGet.mockResolvedValue({
      ok: false,
      error: { code: 'not_found', message: 'Alert not found' },
    });
    await renderAlert();

    expect(await screen.findByText('Alert not found')).toBeOnTheScreen();
  });
});
