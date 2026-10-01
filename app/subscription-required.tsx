import { useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  AppText,
  Button,
  FeedbackBanner,
  Screen,
  StatusPill,
} from '@/presentation/ui';
import { LoadingIndicator } from '@/presentation/ui/LoadingIndicator';
import { appModules } from '@/composition/appModules';
import { PLATFORM_INFO } from '@/config/platformInfo';
import {
  canAccessRolePolicy,
  clubHasAppAccess,
  roleAccessPolicies,
} from '@/core/domain';
import { useAuth, useClub } from '@/presentation/providers';
import { useAppTheme } from '@/theme';

interface SubscriptionPresentation {
  readonly title: string;
  readonly statusLabel: string;
  readonly description: string;
}

const subscriptionPresentation = (
  awaitingSetup: boolean,
  authorizedForBilling: boolean,
): SubscriptionPresentation => {
  if (awaitingSetup) {
    return authorizedForBilling
      ? {
          title: 'Start your club subscription',
          statusLabel: 'Setup required',
          description:
            'Add a payment method to begin the free trial and open access for everyone in your club.',
        }
      : {
          title: 'Your club needs a subscription',
          statusLabel: 'Setup required',
          description:
            'Ask your club President to start it. Access will open automatically once setup is complete.',
        };
  }

  return authorizedForBilling
    ? {
        title: 'Renew your club subscription',
        statusLabel: 'Subscription ended',
        description:
          'Renew now to restore access for everyone in your club.',
      }
    : {
        title: "Your club's subscription has ended.",
        statusLabel: 'Subscription ended',
        description:
          'Ask your club President to renew it. Access will return automatically once the subscription is active.',
      };
};

const SubscriptionRequired = () => {
  const { currentUser, signOut } = useAuth();
  const { access, loading, error: clubError } = useClub();
  const router = useRouter();
  const theme = useAppTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (currentUser && access && clubHasAppAccess(access)) {
      router.replace('/(app)/(tabs)');
    }
  }, [access, currentUser?.id]);

  if (!currentUser) return <Redirect href="/login" />;
  if (loading) return <LoadingIndicator />;

  const billingPolicy = roleAccessPolicies.manageClubBilling;
  const authorizedForBilling = canAccessRolePolicy(
    currentUser.role,
    billingPolicy,
  );
  const awaitingSetup = access?.accessState === 'pending_setup';
  const presentation = subscriptionPresentation(
    awaitingSetup,
    authorizedForBilling,
  );
  const actionLabel = awaitingSetup
    ? 'Start 30-Day Free Trial'
    : 'Renew Subscription';

  const manage = async () => {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    const result =
      access?.suspensionReason === 'nonpayment'
        ? await appModules.clubBilling.payOutstandingInvoice(currentUser)
        : access?.accessState === 'pending_setup'
          ? await appModules.clubBilling.createSetupSession(
              currentUser,
              billingReturnUrl(),
            )
          : await appModules.clubBilling.setCollectionMethod(
              currentUser,
              'automatic',
              billingReturnUrl(),
            );
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    if (!result.value) return;
    await Linking.openURL(result.value.url).catch(() => {
      setError('Could not open secure billing. Please try again.');
    });
  };

  return (
    <Screen scroll contentStyle={{ paddingTop: theme.spacing.xl }}>
      <View
        style={{
          flexGrow: 1,
          width: '100%',
          maxWidth: 560,
          alignSelf: 'center',
          justifyContent: 'center',
          paddingVertical: theme.spacing.xxl,
        }}
      >
        {error || clubError ? (
          <FeedbackBanner message={error ?? clubError!} tone="danger" />
        ) : null}

        <View
          accessibilityRole="header"
          accessibilityLabel={presentation.title}
          style={{ alignItems: 'center', gap: theme.spacing.md }}
        >
          <View
            accessible={false}
            style={{
              width: 64,
              height: 64,
              borderRadius: theme.radii.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: awaitingSetup
                ? theme.colors.warningSurface
                : theme.colors.dangerSurface,
            }}
          >
            <Ionicons
              name="card-outline"
              size={30}
              color={
                awaitingSetup ? theme.colors.warning : theme.colors.danger
              }
            />
          </View>
          <StatusPill
            label={presentation.statusLabel}
            tone={awaitingSetup ? 'warning' : 'danger'}
            style={{ alignSelf: 'center' }}
          />
          <AppText
            variant="pageTitle"
            style={{ textAlign: 'center', maxWidth: 480 }}
          >
            {presentation.title}
          </AppText>
          <AppText
            color="muted"
            style={{ textAlign: 'center', maxWidth: 460 }}
          >
            {presentation.description}
          </AppText>
        </View>

        {authorizedForBilling ? (
          <View
            style={{ marginTop: theme.spacing.xl, gap: theme.spacing.sm }}
          >
            {awaitingSetup ? (
              <FeedbackBanner message="Add a card to start. It will not be charged during the first 30 days." />
            ) : null}
            <Button
              label={actionLabel}
              icon="card-outline"
              loading={busy}
              onPress={() => void manage()}
            />
          </View>
        ) : null}

        <View
          style={{
            marginTop: theme.spacing.xxl,
            paddingTop: theme.spacing.lg,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            alignItems: 'center',
            gap: theme.spacing.sm,
          }}
        >
          <Button
            label="Email Support"
            icon="mail-outline"
            variant="secondary"
            onPress={() =>
              void Linking.openURL(`mailto:${PLATFORM_INFO.supportEmail}`)
            }
          />
        </View>
        <Button
          label="Sign Out"
          icon="log-out-outline"
          variant="tertiary"
          style={{ alignSelf: 'center', marginTop: theme.spacing.sm }}
          onPress={() => void signOut()}
        />
      </View>
    </Screen>
  );
};

const billingReturnUrl = (): string => {
  if (
    Platform.OS !== 'web' ||
    typeof window === 'undefined' ||
    !window.location?.origin
  ) {
    return `${PLATFORM_INFO.webAppOrigin}/subscription-required`;
  }
  return `${window.location.origin}/subscription-required`;
};

export default SubscriptionRequired;
