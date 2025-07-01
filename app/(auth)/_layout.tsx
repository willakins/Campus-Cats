import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/providers';
import { LoadingIndicator } from '@/components';

const AuthLayout = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingIndicator />;
  }

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
