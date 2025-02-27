import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/providers';

const AuthLayout = () => {
  const { currentUser } = useAuth();

  if (currentUser) {
    // If we are already logged in, bypass login screens
    return <Redirect href="/(app)/(tabs)" />;
  }

  return <Stack
    screenOptions={{
      headerShown: false,
    }}
  />;
};

export default AuthLayout;
