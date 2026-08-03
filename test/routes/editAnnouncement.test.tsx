import React from 'react';
import { Alert } from 'react-native';

import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';

import EditAnnouncement from '../../app/(app)/announcements/edit-ann';
import { Role, parseAnnouncement, parseUser } from '../../core/domain';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockGet = jest.fn();
const mockMedia = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'announcement-1' }),
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
}));

jest.mock('../../composition/appModules', () => ({
  appModules: {
    announcements: {
      get: (...args: unknown[]) => mockGet(...args),
      media: (...args: unknown[]) => mockMedia(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      remove: (...args: unknown[]) => mockRemove(...args),
    },
  },
}));

jest.mock('../../providers/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', email: 'admin@gatech.edu', role: 1 },
  }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('../../components', () => {
  const mockReact = require('react');
  const { Pressable: MockPressable, Text: MockText } = require('react-native');
  return {
    Button: ({ children, onPress }: React.PropsWithChildren<{ onPress: () => void }>) =>
      mockReact.createElement(MockPressable, { onPress }, children),
    LoadingIndicator: () => mockReact.createElement(MockText, null, 'Loading announcement'),
    SnackbarMessage: () => null,
  };
});

jest.mock('../../forms/AnnouncementForm', () => {
  const mockReact = require('react');
  const { Text: MockText } = require('react-native');
  return {
    AnnouncementForm: ({ formData }: { formData: { title: string } }) =>
      mockReact.createElement(MockText, null, formData.title),
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

describe('edit announcement route', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    mockBack.mockReset();
    mockReplace.mockReset();
    mockGet.mockReset();
    mockMedia.mockReset();
    mockUpdate.mockReset();
    mockRemove.mockReset();
    mockGet.mockResolvedValue({ ok: true, value: announcement, warnings: [] });
    mockMedia.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockUpdate.mockResolvedValue({ ok: true, value: announcement, warnings: [] });
    mockRemove.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
  });

  it('shows loading state and navigates by ID after a successful save', async () => {
    const user = userEvent.setup();
    render(<EditAnnouncement />);

    expect(screen.getByText('Loading announcement')).toBeOnTheScreen();
    expect(await screen.findByText('Volunteer workday')).toBeOnTheScreen();
    await user.press(screen.getByText('Save Announcement'));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/announcements/view-ann',
        params: { id: 'announcement-1' },
      }),
    );
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'admin-1' }),
      'announcement-1',
      expect.objectContaining({ title: 'Volunteer workday' }),
    );
  });

  it('requires destructive confirmation before deleting', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(<EditAnnouncement />);
    await screen.findByText('Volunteer workday');
    await user.press(screen.getByText('Delete Announcement'));

    expect(mockRemove).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      'Delete Announcement',
      'Delete this announcement forever?',
      expect.any(Array),
    );
    const buttons = alert.mock.calls[0][2];
    const destructive = buttons?.find((button) => button.style === 'destructive');
    await act(async () => destructive?.onPress?.());

    await waitFor(() => expect(mockRemove).toHaveBeenCalled());
    expect(mockReplace).toHaveBeenCalledWith('/announcements');
  });

  it('presents load and mutation errors without navigating', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockGet.mockResolvedValue({
      ok: false,
      error: { code: 'not_found', message: 'Announcement not found' },
    });
    const { unmount } = render(<EditAnnouncement />);
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith('Could not load announcement', 'Announcement not found'),
    );
    unmount();

    alert.mockClear();
    mockGet.mockResolvedValue({ ok: true, value: announcement, warnings: [] });
    mockUpdate.mockResolvedValue({
      ok: false,
      error: { code: 'dependency_failure', message: 'Could not save announcement' },
    });
    const user = userEvent.setup();
    render(<EditAnnouncement />);
    await screen.findByText('Volunteer workday');
    await user.press(screen.getByText('Save Announcement'));
    expect(alert).toHaveBeenCalledWith(
      'Could not save announcement',
      'Could not save announcement',
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
