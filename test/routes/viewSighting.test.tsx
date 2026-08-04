import React from 'react';

import { render, screen, userEvent } from '@testing-library/react-native';

import { Role, localSightingRecord, parseSighting } from '../../core/domain';
import ViewSighting from '../../app/(app)/sighting/view-sighting';
import { AppThemeProvider } from '../../theme';

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
    useRouter: () => ({ push: mockPush, back: jest.fn() }),
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

jest.mock('../../components/entries/SightingEntry', () => {
  const mockReact = require('react');
  const { Text: MockText } = require('react-native');
  return {
    SightingEntry: ({ sighting }: { sighting: { name: string } }) =>
      mockReact.createElement(MockText, null, sighting.name),
  };
});

const renderSighting = () =>
  render(
    <AppThemeProvider colorScheme="light">
      <ViewSighting />
    </AppThemeProvider>,
  );

const sighting = localSightingRecord(parseSighting({
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
}));

describe('view sighting route', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockUserId = 'member-1';
    mockGet.mockResolvedValue({ ok: true, value: sighting, warnings: [] });
    mockMedia.mockResolvedValue({ ok: true, value: [], warnings: [] });
  });

  it('loads by route ID and lets the creator open the editor', async () => {
    const user = userEvent.setup();
    renderSighting();

    expect(await screen.findByText('Goldie')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Edit sighting' }));
    expect(mockGet).toHaveBeenCalledWith('sighting-1');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/sighting/edit-sighting',
      params: { id: 'sighting-1' },
    });
  });

  it('does not offer editing to a different user', async () => {
    mockUserId = 'member-2';
    renderSighting();

    expect(await screen.findByText('Goldie')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Edit sighting' })).not.toBeOnTheScreen();
  });

  it('renders a module error instead of a dummy record', async () => {
    mockGet.mockResolvedValue({
      ok: false,
      error: { code: 'not_found', message: 'Sighting not found' },
    });
    renderSighting();

    expect(await screen.findByText('Sighting not found')).toBeOnTheScreen();
  });
});
