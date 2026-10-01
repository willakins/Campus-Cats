import { Redirect, Stack } from 'expo-router';

import { useAuth, useUniversitySelection } from '@/presentation/providers';
import { LoadingIndicator } from '@/presentation/ui/LoadingIndicator';
import { verticalStackTransition } from '@/presentation/navigation/stackTransitions';
import { useAppTheme, useReducedMotion } from '@/theme';

const AuthLayout = () => {
  const { currentUser, loading } = useAuth();
  const universities = useUniversitySelection();
  const theme = useAppTheme();
  const reducedMotion = useReducedMotion();

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
        ...verticalStackTransition(reducedMotion),
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
};

export default AuthLayout;
