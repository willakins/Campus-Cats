import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/providers';
import { LoadingIndicator } from '@/components';
import { useAppTheme } from '@/theme';

const AuthLayout = () => {
  const { currentUser, loading } = useAuth();
  const theme = useAppTheme();

  if (loading) {
    return <LoadingIndicator />;
  }

  if (currentUser) {
    // If we are already logged in, bypass login screens
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
};

export default AuthLayout;
