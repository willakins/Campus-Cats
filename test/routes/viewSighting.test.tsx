import React from 'react';

import { render, screen, userEvent } from '@testing-library/react-native';

import { Role, parseSighting } from '../../core/domain';
import ViewSighting from '../../app/(app)/sighting/view-sighting';

const mockPush = jest.fn();
const mockGet = jest.fn();
const mockMedia = jest.fn();
let mockUserId = 'member-1';

jest.mock('expo-router', () => {
  const mockReact = require('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) =>
      mockReact.useEffect(effect, [effect]),
    useLocalSearchParams: () => ({ id: 'sighting-1' }),
    useRouter: () => ({ push: mockPush }),
  };
});

jest.mock('../../composition/appModules', () => ({
  appModules: {
    sightings: {
      get: (...args: unknown[]) => mockGet(...args),
      media: (...args: unknown[]) => mockMedia(...args),
    },
  },
}));

jest.mock('../../providers', () => ({
  useAuth: () => ({ user: { id: mockUserId, email: 'member@gatech.edu', role: 0 } }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('../../components', () => {
  const mockReact = require('react');
  const { Pressable: MockPressable, Text: MockText } = require('react-native');
  return {
    Button: ({ children, onPress }: React.PropsWithChildren<{ onPress: () => void }>) =>
      mockReact.createElement(MockPressable, { onPress }, children),
    LoadingIndicator: () =>
      mockReact.createElement(MockText, null, 'Loading sighting'),
    SightingEntry: ({ sighting }: { sighting: { name: string } }) =>
      mockReact.createElement(MockText, null, sighting.name),
  };
});

const sighting = parseSighting({
  id: 'sighting-1',
  name: 'Goldie',
  info: 'Near Tech Tower',
  fed: true,
  health: true,
  date: new Date('2025-04-10T12:00:00.000Z'),
  location: { latitude: 33.772, longitude: -84.394 },
  createdBy: {
    id: 'member-1',
    email: 'member@gatech.edu',
    role: Role.Member,
  },
  timeOfDay: 'Afternoon',
});

describe('view sighting route', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockUserId = 'member-1';
    mockGet.mockResolvedValue({ ok: true, value: sighting, warnings: [] });
    mockMedia.mockResolvedValue({ ok: true, value: [], warnings: [] });
  });

  it('loads by route ID and lets the creator open the editor', async () => {
    const user = userEvent.setup();
    render(<ViewSighting />);

    expect(await screen.findByText('Goldie')).toBeOnTheScreen();
    await user.press(screen.getByText('Edit'));
    expect(mockGet).toHaveBeenCalledWith('sighting-1');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/sighting/edit-sighting',
      params: { id: 'sighting-1' },
    });
  });

  it('does not offer editing to a different user', async () => {
    mockUserId = 'member-2';
    render(<ViewSighting />);

    expect(await screen.findByText('Goldie')).toBeOnTheScreen();
    expect(screen.queryByText('Edit')).not.toBeOnTheScreen();
  });

  it('renders a module error instead of a dummy record', async () => {
    mockGet.mockResolvedValue({
      ok: false,
      error: { code: 'not_found', message: 'Sighting not found' },
    });
    render(<ViewSighting />);

    expect(await screen.findByText('Sighting not found')).toBeOnTheScreen();
  });
});
