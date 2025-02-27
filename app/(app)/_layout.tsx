import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/providers';
import { LoadingIndicator } from '@/components';

const AppLayout = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingIndicator />;
  }

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
