import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/providers';

const AppLayout = () => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    // If we are not logged in, redirect to login screens
    return <Redirect href="/login" />;
  }

  return <Stack
    screenOptions={{
      headerShown: false,
    }}
  />;
};

export default AppLayout;
