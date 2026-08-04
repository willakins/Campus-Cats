import React from 'react';

import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import TabNavigator from '../../app/(app)/(tabs)/_layout';
import { Role } from '../../core/domain';
import { AppThemeProvider } from '../../theme';

let mockRole: Role = Role.Member;

jest.mock('../../providers', () => ({
  useAuth: () => ({ user: { id: 'actor-1', email: 'actor@gatech.edu', role: mockRole } }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('../../app/(app)/(tabs)/index', () => () => null);
jest.mock('../../app/(app)/(tabs)/announcements', () => () => null);
jest.mock('../../app/(app)/(tabs)/catalog', () => () => null);
jest.mock('../../app/(app)/(tabs)/settings', () => () => null);
jest.mock('../../app/(app)/(tabs)/stations', () => () => null);

jest.mock('@react-navigation/bottom-tabs', () => {
  const mockReact = require('react');
  const { View: MockView, Text: MockText } = require('react-native');
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({ children }: React.PropsWithChildren) =>
        mockReact.createElement(MockView, null, children),
      Screen: ({ options }: { options: { tabBarLabel: string } }) =>
        mockReact.createElement(
          MockView,
          {
            accessible: true,
            accessibilityRole: 'tab',
            accessibilityLabel: options.tabBarLabel,
          },
          mockReact.createElement(MockText, null, options.tabBarLabel),
        ),
    }),
  };
});

const renderTabs = () =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      <AppThemeProvider colorScheme="light">
        <TabNavigator />
      </AppThemeProvider>
    </SafeAreaProvider>,
  );

describe('bottom navigation', () => {
  beforeEach(() => {
    mockRole = Role.Member;
  });

  it('shows labeled tabs in the existing route order', () => {
    renderTabs();

    expect(screen.getAllByRole('tab').map((tab) => tab.props.accessibilityLabel)).toEqual([
      'Map',
      'Updates',
      'Cats',
      'More',
    ]);
  });

  it('adds Stations in its existing position for administrators', () => {
    mockRole = Role.Admin;
    renderTabs();

    expect(screen.getAllByRole('tab').map((tab) => tab.props.accessibilityLabel)).toEqual([
      'Map',
      'Updates',
      'Stations',
      'Cats',
      'More',
    ]);
  });
});
