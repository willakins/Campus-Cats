import React from 'react';
import { Platform, StatusBar, StyleSheet, View } from 'react-native';

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const RootLayout = () => {
  const size2 = 29;
  const color2 = '#333'
  const bar_height: number = Platform.select({
    ios: 0,
    android: 60,
    default: 90
  });

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#333" />
      <View style={styles.tabs}>
        <Tabs
          screenOptions={{
            headerShown: false, // Hide the default header
            tabBarStyle: { backgroundColor: 'white', height: bar_height },
            tabBarActiveTintColor: 'tomato',
            tabBarInactiveTintColor: 'gray',
          }}
        >
          <Tabs.Screen
            name="home" // Maps to the `home.tsx` file - this is the map of GTech
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
          <Tabs.Screen
            name="chat" // Maps to the `chat.tsx` file
            options={{
              tabBarLabel: '',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="chatbox-outline" size={size2} color={color2} />
              ),
            }}
          />
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
                <Ionicons name="settings-outline" size={size2} color={color2} />
              ),
            }}
          />
        </Tabs>
      </View>
    </View>
  );
};

export default RootLayout;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end', // Tab navigator will sit at the bottom
  },
  tabs: {
    flex: 1,
    justifyContent: 'flex-end',
    bottom: 0,
    backgroundColor: '#333',
  }
});
