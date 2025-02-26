import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/providers';

const AuthLayout = () => {
  const { user } = useAuth();

  if (user) {
    // If we are already logged in, bypass login screens
    return <Redirect href="/(app)/(tabs)" />;
  }
  return <Stack
    screenOptions={{
      headerShown: true,
    }}
  />;
};

export default AuthLayout;
