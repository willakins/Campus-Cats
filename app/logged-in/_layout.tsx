import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { Tabs } from 'expo-router';

export default function RootLayout() {
  const size = 29;
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Hide the default header
        tabBarStyle: { backgroundColor: 'white', height: 90 },
        tabBarActiveTintColor: 'tomato',
        tabBarInactiveTintColor: 'gray',
      }}
    >
      <Tabs.Screen
        name="index" // Maps to the `index.tsx` file - this is the map of GTech
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="location-outline" size={29} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="announcements" // Maps to the announcements.tsx file
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={29} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="picture" // Maps to the `picture.tsx` file
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="camera-outline" size={29} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat" // Maps to the `chat.tsx` file
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbox-outline" size={29} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="catalog" // Maps to the `catalog.tsx` file
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="image-outline" size={29} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
