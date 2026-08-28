import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';

import { clubHasAppAccess } from '@/core/domain';
import { useAuth, useClub } from '@/providers';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { SubscriptionBanner } from '@/components/billing';
import { TermsAgreementGate } from '@/components/legal';
import { hasAgreedToCurrentTerms } from '@/legal/policies';
import { useAppTheme } from '@/theme';

const AppLayout = () => {
  const { acceptTerms, currentUser, loading } = useAuth();
  const club = useClub();
  const theme = useAppTheme();

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
