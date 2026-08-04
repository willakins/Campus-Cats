import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/providers';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { useAppTheme } from '@/theme';

const AppLayout = () => {
  const { currentUser, loading } = useAuth();
  const theme = useAppTheme();

  if (loading) {
    return <LoadingIndicator />;
  }

  if (!currentUser) {
    // If we are not logged in, redirect to login screens
    return <Redirect href="/login" />;
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

export default AppLayout;
