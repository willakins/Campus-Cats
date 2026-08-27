import React from 'react';

import { render, screen, waitFor } from '@testing-library/react-native';

import ViewEvent from '../../app/(app)/events/view-event';
import { Role, parseClubEvent, parseUser } from '../../core/domain';
import { AppThemeProvider } from '../../theme';

const mockGet = jest.fn();
const mockMarkRead = jest.fn();

jest.mock('expo-router', () => {
  const mockReact = require('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) =>
      mockReact.useEffect(effect, [effect]),
    useLocalSearchParams: () => ({ id: 'event-1' }),
    useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
  };
});

jest.mock('../../composition/appModules', () => ({
  appModules: {
    events: {
      get: (...args: unknown[]) => mockGet(...args),
      markRead: (...args: unknown[]) => mockMarkRead(...args),
      remove: jest.fn(),
    },
  },
}));

jest.mock('../../providers', () => ({
  useAuth: () => ({
    user: { id: 'member-1', email: 'member@gatech.edu', role: 0 },
  }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../components/ui/ProgressiveImage', () => ({
  ProgressiveImage: () => null,
}));

const event = parseClubEvent({
  id: 'event-1',
  title: 'Volunteer workshop',
  details: 'Learn how to help campus cats.',
  location: 'Student Center',
  startsAt: new Date('2099-08-25T12:00:00.000Z'),
  expiresAt: new Date('2099-08-26T12:00:00.000Z'),
  imageUrl: 'https://example.com/event.jpg',
  createdAt: new Date('2026-08-20T12:00:00.000Z'),
  createdBy: parseUser({
    id: 'officer-1',
    email: 'officer@gatech.edu',
    role: Role.Officer,
  }),
});

describe('view event route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({ ok: true, value: event, warnings: [] });
    mockMarkRead.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
  });

  it('marks a successfully loaded event as read', async () => {
    await render(
      <AppThemeProvider colorScheme="light">
        <ViewEvent />
      </AppThemeProvider>,
    );

    expect(await screen.findByText('Volunteer workshop')).toBeOnTheScreen();
    await waitFor(() =>
      expect(mockMarkRead).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'member-1' }),
        'event-1',
      ),
    );
  });
});
