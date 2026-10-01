import React, {
  createContext,
  MutableRefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabBar, BottomTabBarProps, Tabs } from 'expo-router/js-tabs';
import {
  Animated,
  ColorValue,
  Image,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { canAccessRolePolicy, roleAccessPolicies } from '@/core/domain';
import { GlassSurface } from '@/presentation/ui';
import { appModules } from '@/composition/appModules';
import {
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_BAR_COLLAPSED_OPACITY,
  FLOATING_TAB_BAR_COLLAPSED_SCALE,
  FLOATING_TAB_BAR_HORIZONTAL_PADDING,
  FLOATING_TAB_SELECTION_SIZE,
  FloatingTabBarCollapseContext,
  FloatingTabBarContentInsetContext,
  floatingTabBarBottom,
  floatingTabBarContentInset,
  floatingTabSelectionOffset,
} from '@/presentation/navigation/floatingTabBar';
import { useAuth } from '@/presentation/providers';
import { useAppTheme, useReducedMotion } from '@/theme';

type TabIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface NavigationTabIconProps {
  readonly activeName: TabIconName;
  readonly color: ColorValue;
  readonly focused: boolean;
  readonly inactiveName: TabIconName;
  readonly size: number;
}

const NavigationTabIcon = ({
  activeName,
  color,
  focused,
  inactiveName,
  size,
}: NavigationTabIconProps) => {
  const theme = useAppTheme();
  return (
    <View
      style={{
        width: theme.layout.minTouchTarget + theme.spacing.xs,
        height: theme.layout.minTouchTarget + theme.spacing.xs,
        borderRadius: theme.radii.pill,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: focused ? 1.04 : 1 }],
      }}
    >
      <MaterialCommunityIcons
        name={focused ? activeName : inactiveName}
        size={focused ? size + 2 : size + 1}
        color={color}
      />
    </View>
  );
};

interface ProfileTabIconProps {
  readonly color: ColorValue;
  readonly displayName: string;
  readonly focused: boolean;
  readonly photoUrl?: string;
  readonly size: number;
}

const ProfileTabIcon = ({
  color,
  displayName,
  focused,
  photoUrl,
  size,
}: ProfileTabIconProps) => {
  const theme = useAppTheme();
  const avatarSize = size + 5;
  return (
    <View
      style={{
        width: theme.layout.minTouchTarget + theme.spacing.xs,
        height: theme.layout.minTouchTarget + theme.spacing.xs,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: focused ? 1.04 : 1 }],
      }}
    >
      {photoUrl ? (
        <Image
          accessibilityLabel={`${displayName}'s profile picture`}
          source={{ uri: photoUrl }}
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            borderWidth: focused ? 2 : 1,
            borderColor: focused ? color : theme.colors.border,
            opacity: focused ? 1 : 0.82,
          }}
        />
      ) : (
        <MaterialCommunityIcons
          name={focused ? 'account-circle' : 'account-circle-outline'}
          size={focused ? size + 2 : size + 1}
          color={color}
        />
      )}
    </View>
  );
};

interface TabSelectionState {
  readonly activeIndex: number;
  readonly controller: MutableRefObject<TabSelectionController>;
  readonly tabCount: number;
}

interface TabSelectionController {
  select(index: number): void;
}

const idleTabSelectionController: MutableRefObject<TabSelectionController> = {
  current: { select: () => undefined },
};

const TabSelectionContext = createContext<TabSelectionState>({
  activeIndex: 0,
  controller: idleTabSelectionController,
  tabCount: 1,
});

interface SlidingTabBarProps extends BottomTabBarProps {
  readonly selectionController: MutableRefObject<TabSelectionController>;
}

const SlidingTabBar = ({
  selectionController,
  ...props
}: SlidingTabBarProps) => (
  <TabSelectionContext.Provider
    value={{
      activeIndex: props.state.index,
      controller: selectionController,
      tabCount: props.state.routes.length,
    }}
  >
    <BottomTabBar {...props} />
  </TabSelectionContext.Provider>
);

const GlassTabBarBackground = () => {
  const theme = useAppTheme();
  const reducedMotion = useReducedMotion();
  const { activeIndex, controller, tabCount } = useContext(TabSelectionContext);
  const [tabBarWidth, setTabBarWidth] = useState(0);
  const [selectionVisible, setSelectionVisible] = useState(false);
  const selectionX = useRef(new Animated.Value(0)).current;
  const selectionPositioned = useRef(false);
  const activeAnimation = useRef<Animated.CompositeAnimation | undefined>(
    undefined,
  );
  const lastTarget = useRef<number | undefined>(undefined);

  const moveSelection = useCallback(
    (index: number) => {
      if (tabBarWidth === 0) return;
      const nextX = floatingTabSelectionOffset(tabBarWidth, tabCount, index);
      if (selectionPositioned.current && lastTarget.current === nextX) return;
      activeAnimation.current?.stop();
      lastTarget.current = nextX;
      if (
        !selectionPositioned.current ||
        reducedMotion ||
        process.env.NODE_ENV === 'test'
      ) {
        selectionX.setValue(nextX);
        selectionPositioned.current = true;
        setSelectionVisible(true);
        return;
      }
      const animation = Animated.spring(selectionX, {
        toValue: nextX,
        damping: 20,
        stiffness: 220,
        mass: 0.7,
        useNativeDriver: Platform.OS !== 'web',
      });
      activeAnimation.current = animation;
      animation.start();
    },
    [reducedMotion, selectionX, tabBarWidth, tabCount],
  );

  useEffect(() => {
    controller.current.select = moveSelection;
    return () => {
      controller.current.select = () => undefined;
      activeAnimation.current?.stop();
    };
  }, [controller, moveSelection]);

  useEffect(() => {
    moveSelection(activeIndex);
  }, [activeIndex, moveSelection]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setTabBarWidth(event.nativeEvent.layout.width);
  };

  return (
    <GlassSurface
      onLayout={handleLayout}
      style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: (FLOATING_TAB_BAR_HEIGHT - FLOATING_TAB_SELECTION_SIZE) / 2,
          width: FLOATING_TAB_SELECTION_SIZE,
          height: FLOATING_TAB_SELECTION_SIZE,
          borderRadius: theme.radii.pill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.glassSelectionBorder,
          backgroundColor: theme.dark
            ? `${theme.colors.primary}24`
            : `${theme.colors.surface}70`,
          opacity: selectionVisible ? 1 : 0,
          transform: [{ translateX: selectionX }],
        }}
      />
    </GlassSurface>
  );
};

const TabNavigator = () => {
  const { user } = useAuth();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const tabBarBottom = floatingTabBarBottom(insets.bottom);
  const tabBarContentInset = floatingTabBarContentInset(insets.bottom);
  const canManageStations = canAccessRolePolicy(
    user.role,
    roleAccessPolicies.manageStations,
  );
  const [profileIcon, setProfileIcon] = useState<{
    readonly displayName: string;
    readonly photoUrl?: string;
  }>({ displayName: user.email });
  const [tabBarCollapsed, setTabBarCollapsed] = useState(false);
  const tabBarCollapseProgress = useRef(new Animated.Value(0)).current;
  const refreshProfileIcon = useCallback(async () => {
    const result = await appModules.profiles.get(user.id);
    if (result.ok) {
      setProfileIcon({
        displayName: result.value.displayName,
        photoUrl: result.value.profilePhotoUrl || undefined,
      });
    }
  }, [user.id]);
  useEffect(() => {
    setProfileIcon({ displayName: user.email });
    void refreshProfileIcon();
  }, [refreshProfileIcon, user.email]);
  useEffect(() => {
    const nextValue = tabBarCollapsed ? 1 : 0;
    if (reducedMotion || process.env.NODE_ENV === 'test') {
      tabBarCollapseProgress.setValue(nextValue);
      return undefined;
    }
    const animation = Animated.spring(tabBarCollapseProgress, {
      toValue: nextValue,
      damping: 18,
      stiffness: 210,
      mass: 0.7,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [reducedMotion, tabBarCollapseProgress, tabBarCollapsed]);
  const selectionController = useRef<TabSelectionController>({
    select: () => undefined,
  });
  const tabPressListeners = (index: number, onPress?: () => void) => ({
    tabPress: () => {
      setTabBarCollapsed(false);
      selectionController.current.select(index);
      onPress?.();
    },
  });
  const tabBarScale = tabBarCollapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, FLOATING_TAB_BAR_COLLAPSED_SCALE],
  });
  const tabBarOpacity = tabBarCollapseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, FLOATING_TAB_BAR_COLLAPSED_OPACITY],
  });
  const collapseTabBar = useCallback(() => setTabBarCollapsed(true), []);

  return (
    <FloatingTabBarCollapseContext.Provider value={collapseTabBar}>
      <FloatingTabBarContentInsetContext.Provider value={tabBarContentInset}>
        <Tabs
          detachInactiveScreens
          tabBar={(props) => (
            <SlidingTabBar
              {...props}
              selectionController={selectionController}
            />
          )}
          screenOptions={{
            freezeOnBlur: true,
            headerShown: false,
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.textMuted,
            tabBarShowLabel: false,
            tabBarHideOnKeyboard: true,
            tabBarBackground: GlassTabBarBackground,
            sceneStyle: { paddingBottom: 0 },
            // UIKit's label-less tab item keeps its icon at the top by default.
            // Give its wrapper the same size as our selection surface and center it
            // within the bar's 56pt content area in regular and compact layouts.
            tabBarIconStyle: {
              width: theme.layout.minTouchTarget + theme.spacing.xs,
              height: theme.layout.minTouchTarget + theme.spacing.xs,
              transform: [{ translateY: -theme.spacing.xxs + 1 }],
            },
            tabBarItemStyle: {
              minHeight: theme.layout.minTouchTarget,
              marginHorizontal: theme.spacing.xxs / 2,
              borderRadius: theme.radii.pill,
            },
            tabBarStyle: {
              ...theme.elevation.floating,
              position: 'absolute',
              start: theme.spacing.xxl,
              end: theme.spacing.xxl,
              bottom: tabBarBottom,
              height: FLOATING_TAB_BAR_HEIGHT,
              paddingTop: theme.spacing.xxs,
              paddingBottom: theme.spacing.xxs,
              paddingHorizontal: FLOATING_TAB_BAR_HORIZONTAL_PADDING,
              borderTopWidth: 0,
              borderWidth: 0,
              borderRadius: theme.radii.sheet,
              backgroundColor: 'transparent',
              opacity: tabBarOpacity,
              transform: [{ scale: tabBarScale }],
            },
          }}
        >
          <Tabs.Screen
            name="index"
            listeners={tabPressListeners(0)}
            options={{
              tabBarLabel: 'Map',
              tabBarAccessibilityLabel: 'Map',
              sceneStyle: { paddingBottom: 0 },
              tabBarIcon: ({ color, focused, size }) => (
                <NavigationTabIcon
                  activeName="map"
                  inactiveName="map-outline"
                  color={color}
                  focused={focused}
                  size={size}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="community"
            listeners={tabPressListeners(1)}
            options={{
              tabBarLabel: 'Community',
              tabBarAccessibilityLabel: 'Community',
              tabBarIcon: ({ color, focused, size }) => (
                <NavigationTabIcon
                  activeName="account-group"
                  inactiveName="account-group-outline"
                  color={color}
                  focused={focused}
                  size={size}
                />
              ),
            }}
          />
          <Tabs.Protected guard={canManageStations}>
            <Tabs.Screen
              name="stations"
              listeners={tabPressListeners(2)}
              options={{
                tabBarLabel: 'Stations',
                tabBarAccessibilityLabel: 'Stations',
                tabBarIcon: ({ color, focused, size }) => (
                  <NavigationTabIcon
                    activeName="basket"
                    inactiveName="basket-outline"
                    color={color}
                    focused={focused}
                    size={size}
                  />
                ),
              }}
            />
          </Tabs.Protected>
          <Tabs.Screen
            name="catalog"
            listeners={tabPressListeners(canManageStations ? 3 : 2)}
            options={{
              tabBarLabel: 'Cats',
              tabBarAccessibilityLabel: 'Cats',
              tabBarIcon: ({ color, focused, size }) => (
                <NavigationTabIcon
                  activeName="paw"
                  inactiveName="paw-outline"
                  color={color}
                  focused={focused}
                  size={size}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            listeners={tabPressListeners(
              canManageStations ? 4 : 3,
              () => void refreshProfileIcon(),
            )}
            options={{
              tabBarLabel: 'More',
              tabBarAccessibilityLabel: 'More',
              tabBarIcon: ({ color, focused, size }) => (
                <ProfileTabIcon
                  color={color}
                  displayName={profileIcon.displayName}
                  focused={focused}
                  photoUrl={profileIcon.photoUrl}
                  size={size}
                />
              ),
            }}
          />
        </Tabs>
      </FloatingTabBarContentInsetContext.Provider>
    </FloatingTabBarCollapseContext.Provider>
  );
};
export default TabNavigator;
