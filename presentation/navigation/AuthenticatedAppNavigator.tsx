import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';

import { clubHasAppAccess } from '@/core/domain';
import { useAuth, useClub } from '@/presentation/providers';
import { LoadingIndicator } from '@/presentation/ui/LoadingIndicator';
import { SubscriptionBanner } from '@/presentation/billing';
import { TermsAgreementGate } from '@/presentation/legal';
import { verticalStackTransition } from '@/presentation/navigation/stackTransitions';
import { hasAgreedToCurrentTerms } from '@/presentation/legal';
import { useAppTheme, useReducedMotion } from '@/theme';

const AppLayout = () => {
  const { acceptTerms, currentUser, loading } = useAuth();
  const club = useClub();
  const theme = useAppTheme();
  const reducedMotion = useReducedMotion();

  if (loading || (Boolean(currentUser) && club.loading)) {
    return <LoadingIndicator />;
  }

  if (!currentUser) {
    // If we are not logged in, redirect to login screens
    return <Redirect href="/login" />;
  }

  if (!club.access || !clubHasAppAccess(club.access)) {
    return <Redirect href={'/subscription-required' as never} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <SubscriptionBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          ...verticalStackTransition(reducedMotion),
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
      <TermsAgreementGate
        visible={!hasAgreedToCurrentTerms(currentUser)}
        onAgree={acceptTerms}
      />
    </View>
  );
};

export default AppLayout;
