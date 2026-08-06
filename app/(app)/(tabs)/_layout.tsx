import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { canManageFeature } from '@/core/domain';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';
const TabNavigator = () => {
  const { user } = useAuth();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const isAdmin = canManageFeature(user.role);

  return (
    <Tabs
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
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          tabBarLabel: 'Updates',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Protected guard={isAdmin}>
        <Tabs.Screen
          name="stations"
          options={{
            tabBarLabel: 'Stations',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="basket-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs.Protected>
      <Tabs.Screen
        name="catalog"
        options={{
          tabBarLabel: 'Cats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="paw-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
};
export default TabNavigator;
