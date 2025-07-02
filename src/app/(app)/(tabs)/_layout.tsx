import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Platform } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

// Assuming useAuth gives you user info
import { useAuth } from '@/providers';

import Announcements from './announcements';
import Catalog from './catalog';
import HomeScreen from './index';
import Settings from './settings';
// Admin-only screen
import Stations from './stations';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { user } = useAuth(); // Assuming useAuth hook provides user details
  const isAdmin = user.role === 1 || user.role === 2;
  const size2 = 29;
  const color2 = '#333';
  const bar_height: number = Platform.select({
    ios: 80,
    android: 60,
    default: 80,
  });

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // Hide the default header
        tabBarStyle: { backgroundColor: 'white', height: bar_height },
        tabBarActiveTintColor: 'tomato',
        tabBarInactiveTintColor: 'gray',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="location-outline" size={size2} color={color2} />
          ),
        }}
      />
      <Tab.Screen
        name="Announcements"
        component={Announcements}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="notifications-outline"
              size={size2}
              color={color2}
            />
          ),
        }}
      />
      {isAdmin && (
        <Tab.Screen
          name="Stations"
          component={Stations}
          options={{
            tabBarLabel: '',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="paw-outline" size={size2} color={color2} />
            ),
          }}
        />
      )}
      <Tab.Screen
        name="Catalog"
        component={Catalog}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="image-outline" size={size2} color={color2} />
          ),
        }}
      />
      <Tab.Screen
        name="Info"
        component={Settings}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="information-circle-outline"
              size={size2}
              color={color2}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
export default TabNavigator;
