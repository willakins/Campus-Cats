import { Redirect, Stack } from 'expo-router';

import { useAuth, useUniversitySelection } from '@/providers';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { useAppTheme } from '@/theme';

const AuthLayout = () => {
  const { currentUser, loading } = useAuth();
  const universities = useUniversitySelection();
  const theme = useAppTheme();

  if (loading || universities.loading) {
    return <LoadingIndicator />;
  }

  if (currentUser) {
    // If we are already logged in, bypass login screens
    return <Redirect href="/(app)/(tabs)" />;
  }

  if (!universities.university) {
    return <Redirect href={'/university-search' as never} />;
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
