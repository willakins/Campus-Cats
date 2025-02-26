import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/providers';

const AppLayout = () => {
  const { user } = useAuth();

  if (!user) {
    // If we are not logged in, redirect to login screens
    return <Redirect href="/login" />;
  }
  return <Stack
    screenOptions={{
      headerShown: true,
    }}
  />;
};

export default AppLayout;
