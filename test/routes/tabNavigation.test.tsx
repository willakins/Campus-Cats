import React from 'react';

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import TabNavigator from '../../app/(app)/(tabs)/_layout';
import { Role } from '../../core/domain';
import { AppThemeProvider } from '../../theme';

let mockRole: Role = Role.Member;
let mockTabBarShowLabel: boolean | undefined;
let mockTabBarHideOnKeyboard: boolean | undefined;
let mockTabBarStyle: Record<string, unknown> | undefined;
let mockSceneStyle: Record<string, unknown> | undefined;
let mockTabBarIconStyle: Record<string, unknown> | undefined;
let mockHasCustomTabBar = false;
let mockDetachInactiveScreens: boolean | undefined;
let mockFreezeOnBlur: boolean | undefined;
const mockGetProfile = jest.fn();

jest.mock('../../presentation/providers', () => ({
  useAuth: () => ({
    user: { id: 'actor-1', email: 'actor@gatech.edu', role: mockRole },
  }),
}));

jest.mock('../../composition/appModules', () => ({
  appModules: {
    profiles: {
      get: (...args: unknown[]) => mockGetProfile(...args),
    },
  },
}));

jest.mock('@expo/vector-icons', () => {
  const mockReact = require('react');
  const { View: MockView } = require('react-native');
  return {
    MaterialCommunityIcons: ({ name, ...props }: { name: string }) =>
      mockReact.createElement(MockView, {
        ...props,
        testID: `tab-icon-${name}`,
      }),
  };
});

jest.mock('expo-glass-effect', () => ({
  GlassView: require('react-native').View,
  isGlassEffectAPIAvailable: () => false,
  isLiquidGlassAvailable: () => false,
}));

jest.mock('expo-blur', () => ({
  BlurView: require('react-native').View,
}));

jest.mock('expo-router/js-tabs', () => {
  const mockReact = require('react');
  const {
    Pressable: MockPressable,
    View: MockView,
    Text: MockText,
  } = require('react-native');
  const MockScreen = ({
    name,
    listeners,
    options,
  }: {
    name: string;
    listeners?: { tabPress?: () => void };
    options: {
      tabBarLabel: string;
      tabBarAccessibilityLabel: string;
      tabBarIcon?: (props: {
        color: string;
        focused: boolean;
        size: number;
      }) => React.ReactNode;
    };
  }) =>
    mockReact.createElement(
      MockPressable,
      {
        accessible: true,
        accessibilityRole: 'tab',
        accessibilityLabel: options.tabBarAccessibilityLabel,
        onPress: listeners?.tabPress,
      },
      options.tabBarIcon?.({
        color: name === 'index' ? '#18314F' : '#62645C',
        focused: name === 'index',
        size: 24,
      }),
      mockTabBarShowLabel === false
        ? null
        : mockReact.createElement(MockText, null, options.tabBarLabel),
    );
  const MockTabs = ({
    children,
    screenOptions,
    tabBar,
    detachInactiveScreens,
  }: React.PropsWithChildren<{
    screenOptions?: {
      tabBarHideOnKeyboard?: boolean;
      tabBarShowLabel?: boolean;
      tabBarStyle?: Record<string, unknown>;
      tabBarIconStyle?: Record<string, unknown>;
      sceneStyle?: Record<string, unknown>;
      freezeOnBlur?: boolean;
    };
    tabBar?: unknown;
    detachInactiveScreens?: boolean;
  }>) => {
    const {
      FloatingTabBarCollapseContext,
    } = require('../../presentation/navigation/floatingTabBar');
    const collapseTabBar = mockReact.useContext(FloatingTabBarCollapseContext);
    mockTabBarShowLabel = screenOptions?.tabBarShowLabel;
    mockTabBarHideOnKeyboard = screenOptions?.tabBarHideOnKeyboard;
    mockTabBarStyle = screenOptions?.tabBarStyle;
    mockTabBarIconStyle = screenOptions?.tabBarIconStyle;
    mockSceneStyle = screenOptions?.sceneStyle;
    mockHasCustomTabBar = typeof tabBar === 'function';
    mockDetachInactiveScreens = detachInactiveScreens;
    mockFreezeOnBlur = screenOptions?.freezeOnBlur;
    return mockReact.createElement(
      MockView,
      null,
      mockReact.createElement(MockPressable, {
        testID: 'simulate-content-drag',
        onPress: collapseTabBar,
      }),
      children,
    );
  };
  const MockProtected = ({
    guard,
    children,
  }: React.PropsWithChildren<{ guard: boolean }>) => (guard ? children : null);
  MockTabs.Screen = MockScreen;
  MockTabs.Protected = MockProtected;

  return {
    BottomTabBar: MockView,
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
    mockTabBarHideOnKeyboard = undefined;
    mockTabBarIconStyle = undefined;
    mockTabBarStyle = undefined;
    mockSceneStyle = undefined;
    mockHasCustomTabBar = false;
    mockDetachInactiveScreens = undefined;
    mockFreezeOnBlur = undefined;
    mockGetProfile.mockResolvedValue({
      ok: true,
      value: {
        displayName: 'Alex Catfan',
        profilePhotoUrl: 'https://images.example.edu/alex.jpg',
      },
      warnings: [],
    });
  });

  it('shows icon-only tabs with accessible names in the existing route order', async () => {
    await renderTabs();

    expect(
      screen.getAllByRole('tab').map((tab) => tab.props.accessibilityLabel),
    ).toEqual(['Map', 'Community', 'Cats', 'More']);
    expect(screen.queryByText('Map')).not.toBeOnTheScreen();
    expect(screen.queryByText('Community')).not.toBeOnTheScreen();
    expect(screen.queryByText('Cats')).not.toBeOnTheScreen();
    expect(screen.queryByText('More')).not.toBeOnTheScreen();
    expect(screen.getByTestId('tab-icon-map')).toBeOnTheScreen();
    expect(screen.getByTestId('tab-icon-map')).toHaveProp('size', 26);
    expect(
      screen.getByTestId('tab-icon-account-group-outline'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('tab-icon-account-group-outline')).toHaveProp(
      'size',
      25,
    );
    expect(screen.getByTestId('tab-icon-paw-outline')).toBeOnTheScreen();
    expect(
      await screen.findByLabelText("Alex Catfan's profile picture"),
    ).toHaveProp('source', { uri: 'https://images.example.edu/alex.jpg' });
    expect(mockGetProfile).toHaveBeenCalledWith('actor-1');
  });

  it('floats above content as a compact keyboard-aware capsule', async () => {
    await renderTabs();

    expect(mockTabBarHideOnKeyboard).toBe(true);
    expect(mockTabBarStyle).toEqual(
      expect.objectContaining({
        position: 'absolute',
        start: 32,
        end: 32,
        bottom: 42,
        height: 64,
        borderTopWidth: 0,
        borderWidth: 0,
        borderRadius: 28,
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 4,
      }),
    );
    expect(mockTabBarIconStyle).toEqual({
      width: 52,
      height: 52,
      transform: [{ translateY: -3 }],
    });
    expect(mockSceneStyle).toEqual({ paddingBottom: 0 });
  });

  it('drives the sliding selection from immediate navigation state', async () => {
    await renderTabs();

    expect(mockHasCustomTabBar).toBe(true);
    expect(mockDetachInactiveScreens).toBe(true);
    expect(mockFreezeOnBlur).toBe(true);
  });

  it('shrinks after scrolling and restores when a tab is pressed', async () => {
    await renderTabs();

    await act(async () => {
      fireEvent.press(screen.getByTestId('simulate-content-drag'));
    });
    expect(
      (mockTabBarStyle?.opacity as { __getValue: () => number }).__getValue(),
    ).toBeCloseTo(0.72);
    expect(
      (
        mockTabBarStyle?.transform as { scale: { __getValue: () => number } }[]
      )[0].scale.__getValue(),
    ).toBeCloseTo(0.76);

    await act(async () => {
      fireEvent.press(screen.getByRole('tab', { name: 'Map' }));
    });
    expect(
      (mockTabBarStyle?.opacity as { __getValue: () => number }).__getValue(),
    ).toBe(1);
  });

  it('adds Stations in its existing position for administrators', async () => {
    mockRole = Role.Officer;
    await renderTabs();

    expect(
      screen.getAllByRole('tab').map((tab) => tab.props.accessibilityLabel),
    ).toEqual(['Map', 'Community', 'Stations', 'Cats', 'More']);
    expect(screen.queryByText('Stations')).not.toBeOnTheScreen();
    expect(screen.getByTestId('tab-icon-basket-outline')).toBeOnTheScreen();
  });
});
