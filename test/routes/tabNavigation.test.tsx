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

jest.mock('expo-router', () => {
  const mockReact = require('react');
  const { View: MockView, Text: MockText } = require('react-native');
  const MockScreen = ({ options }: { options: { tabBarLabel: string } }) =>
    mockReact.createElement(
      MockView,
      {
        accessible: true,
        accessibilityRole: 'tab',
        accessibilityLabel: options.tabBarLabel,
      },
      mockReact.createElement(MockText, null, options.tabBarLabel),
    );
  const MockTabs = ({ children }: React.PropsWithChildren) =>
    mockReact.createElement(MockView, null, children);
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

  it('shows labeled tabs in the existing route order', async () => {
    await renderTabs();

    expect(screen.getAllByRole('tab').map((tab) => tab.props.accessibilityLabel)).toEqual([
      'Map',
      'Community',
      'Cats',
      'More',
    ]);
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
  });
});
