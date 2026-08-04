import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { canManageFeature } from '@/core/domain';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';
import HomeScreen from './index';
import Announcements from './announcements';
import Catalog from './catalog';
import Settings from './settings';
import Stations from './stations';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { user } = useAuth();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const isAdmin = canManageFeature(user.role);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarActiveBackgroundColor: theme.colors.primarySurface,
        tabBarLabelStyle: theme.typography.caption,
        tabBarItemStyle: {
          minHeight: theme.layout.minTouchTarget,
          marginVertical: theme.spacing.xxs,
          marginHorizontal: theme.spacing.xxs,
          borderRadius: theme.radii.chip,
        },
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingTop: theme.spacing.xxs,
          paddingBottom: Math.max(insets.bottom, theme.spacing.xs),
          paddingHorizontal: theme.spacing.xxs,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Announcements"
        component={Announcements}
        options={{
          tabBarLabel: 'Updates',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      {isAdmin && (
        <Tab.Screen
          name="Stations"
          component={Stations}
          options={{
            tabBarLabel: 'Stations',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="basket-outline" size={size} color={color} />
            ),
          }}
        />
      )}
      <Tab.Screen
        name="Catalog"
        component={Catalog}
        options={{
          tabBarLabel: 'Cats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="paw-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Info"
        component={Settings}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
export default TabNavigator;
