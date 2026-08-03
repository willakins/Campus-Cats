import React from 'react';

import { render, screen, waitFor } from '@testing-library/react-native';

import Announcements from '../../app/(app)/(tabs)/announcements';
import { Role, parseAnnouncement, parseUser } from '../../core/domain';

const mockList = jest.fn();
const mockPush = jest.fn();
let mockRole: Role = Role.Admin;

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

jest.mock('../../components', () => {
  const mockReact = require('react');
  const { Pressable: MockPressable, Text: MockText } = require('react-native');
  return {
    AnnouncementItem: ({ title }: { title: string }) =>
      mockReact.createElement(MockText, null, title),
    Button: ({ children, onPress }: React.PropsWithChildren<{ onPress: () => void }>) =>
      mockReact.createElement(MockPressable, { onPress }, children),
    Errorbar: ({ error }: { error: string }) =>
      error ? mockReact.createElement(MockText, null, error) : null,
  };
});

const announcement = parseAnnouncement({
  id: 'announcement-1',
  title: 'Volunteer workday',
  info: 'Meet at noon.',
  createdAt: new Date('2025-04-15T12:00:00.000Z'),
  createdBy: parseUser({
    id: 'admin-1',
    email: 'admin@gatech.edu',
    role: Role.Admin,
  }),
  authorAlias: 'Campus Cats',
});

describe('announcements list route', () => {
  beforeEach(() => {
    mockList.mockReset();
    mockPush.mockReset();
    mockRole = Role.Admin;
  });

  it('renders an empty result and limits creation to administrators', async () => {
    mockList.mockResolvedValue({ ok: true, value: [], warnings: [] });
    const { rerender } = render(<Announcements />);

    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(screen.getByText('Announcements')).toBeOnTheScreen();
    expect(screen.queryByText('Volunteer workday')).not.toBeOnTheScreen();
    expect(screen.getByText('Create Announcement')).toBeOnTheScreen();

    mockRole = Role.Member;
    rerender(<Announcements />);
    expect(screen.queryByText('Create Announcement')).not.toBeOnTheScreen();
  });

  it('renders successful results and module errors', async () => {
    mockList.mockResolvedValue({ ok: true, value: [announcement], warnings: [] });
    const { unmount } = render(<Announcements />);
    expect(await screen.findByText('Volunteer workday')).toBeOnTheScreen();
    unmount();

    mockList.mockResolvedValue({
      ok: false,
      error: { code: 'dependency_failure', message: 'Could not load announcements' },
    });
    render(<Announcements />);
    expect(await screen.findByText('Could not load announcements')).toBeOnTheScreen();
  });
});
