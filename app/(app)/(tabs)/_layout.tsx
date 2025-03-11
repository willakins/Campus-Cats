import React from 'react';
import { Platform, View } from 'react-native';
import { globalStyles } from '@/styles';

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers';


const HomeLayout = () => {
  const size2 = 29;
  const color2 = '#333'
  const bar_height: number = Platform.select({
    ios: 40,
    android: 60,
    default: 40
  });
  const { user, loading } = useAuth();
  const isAdmin = user.role === 1 || user.role === 2;

  return (
      <View style={globalStyles.tabs}>
        <Tabs
          screenOptions={{
            headerShown: false, // Hide the default header
            tabBarStyle: { backgroundColor: 'white', height: bar_height },
            tabBarActiveTintColor: 'tomato',
            tabBarInactiveTintColor: 'gray',
          }}
        >
          <Tabs.Screen
            name="index" // Maps to the `index.tsx` file - this is the map of GTech
            options={{
              tabBarLabel: '',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="location-outline" size={size2} color={color2} />
              ),
            }}
          />
          <Tabs.Screen
            name="announcements" // Maps to the announcements.tsx file
            options={{
              tabBarLabel: '',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="notifications-outline" size={size2} color={color2} />
              ),
            }}
          />
          {isAdmin ? <Tabs.Screen
            name="stations" // Maps to the `station.tsx` file
            options={{
              tabBarLabel: '',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="paw-outline" size={size2} color={color2} />
              ),
            }}
          /> : null}
          <Tabs.Screen
            name="catalog" // Maps to the `catalog.tsx` file
            options={{
              tabBarLabel: '',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="image-outline" size={size2} color={color2} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings" // Maps to the `catalog.tsx` file
            options={{
              tabBarLabel: '',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="information-circle-outline" size={size2} color={color2} />
              ),
            }}
          />
        </Tabs>
      </View>
  );
};
export default HomeLayout;