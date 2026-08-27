import React from 'react';

import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import TabNavigator from '../../app/(app)/(tabs)/_layout';
import { Role } from '../../core/domain';
import { AppThemeProvider } from '../../theme';

let mockRole: Role = Role.Member;
let mockTabBarShowLabel: boolean | undefined;

jest.mock('../../providers', () => ({
  useAuth: () => ({ user: { id: 'actor-1', email: 'actor@gatech.edu', role: mockRole } }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('expo-router', () => {
  const mockReact = require('react');
  const { View: MockView, Text: MockText } = require('react-native');
  const MockScreen = ({
    options,
  }: {
    options: { tabBarLabel: string; tabBarAccessibilityLabel: string };
  }) =>
    mockReact.createElement(
      MockView,
      {
        accessible: true,
        accessibilityRole: 'tab',
        accessibilityLabel: options.tabBarAccessibilityLabel,
      },
      mockTabBarShowLabel === false
        ? null
        : mockReact.createElement(MockText, null, options.tabBarLabel),
    );
  const MockTabs = ({
    children,
    screenOptions,
  }: React.PropsWithChildren<{
    screenOptions?: { tabBarShowLabel?: boolean };
  }>) => {
    mockTabBarShowLabel = screenOptions?.tabBarShowLabel;
    return mockReact.createElement(MockView, null, children);
  };
  const MockProtected = ({ guard, children }: React.PropsWithChildren<{ guard: boolean }>) =>
    guard ? children : null;
  MockTabs.Screen = MockScreen;
  MockTabs.Protected = MockProtected;

  return {
    Tabs: MockTabs,
  };
});

const renderTabs = async () =>
  await render(
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

  it('shows icon-only tabs with accessible names in the existing route order', async () => {
    await renderTabs();

    expect(screen.getAllByRole('tab').map((tab) => tab.props.accessibilityLabel)).toEqual([
      'Map',
      'Community',
      'Cats',
      'More',
    ]);
    expect(screen.queryByText('Map')).not.toBeOnTheScreen();
    expect(screen.queryByText('Community')).not.toBeOnTheScreen();
    expect(screen.queryByText('Cats')).not.toBeOnTheScreen();
    expect(screen.queryByText('More')).not.toBeOnTheScreen();
  });

  it('adds Stations in its existing position for administrators', async () => {
    mockRole = Role.Officer;
    await renderTabs();

    expect(screen.getAllByRole('tab').map((tab) => tab.props.accessibilityLabel)).toEqual([
      'Map',
      'Community',
      'Stations',
      'Cats',
      'More',
    ]);
    expect(screen.queryByText('Stations')).not.toBeOnTheScreen();
  });
});
