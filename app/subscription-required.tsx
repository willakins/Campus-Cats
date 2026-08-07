import { useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';

import {
  AppHeader,
  AppText,
  Button,
  Card,
  FeedbackBanner,
  Screen,
  StatusPill,
} from '@/components/design';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { appModules } from '@/composition/appModules';
import { Role, clubHasAppAccess, clubSubscriptionLabel } from '@/core/domain';
import { useAuth, useClub } from '@/providers';
import { useAppTheme } from '@/theme';

const SUPPORT_EMAIL = 'willakins23@gmail.com';

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

  const isPresident = currentUser.role === Role.President;
  const canManageOnWeb = Platform.OS === 'web' && isPresident;
  const label = access ? clubSubscriptionLabel(access) : 'No subscription';
  const actionLabel =
    access?.accessState === 'pending_setup'
      ? 'Set Up Club Billing'
      : access?.suspensionReason === 'nonpayment'
        ? 'Pay to Re-enable'
        : 'Restart Subscription';

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
              webReturnUrl(),
            )
          : await appModules.clubBilling.setCollectionMethod(
              currentUser,
              access?.collectionMethod ?? 'automatic',
              webReturnUrl(),
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

  const activateManual = async () => {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    const result = await appModules.clubBilling.setCollectionMethod(
      currentUser,
      'manual',
      webReturnUrl(),
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
    } else if (result.value) {
      await Linking.openURL(result.value.url).catch(() =>
        setError('Could not open secure billing. Please try again.'),
      );
    }
  };

  return (
    <Screen scroll>
      <AppHeader title="Subscription required" eyebrow="Campus Cats" />
      <View style={{ gap: theme.spacing.lg }}>
        {error || clubError ? (
          <FeedbackBanner message={error ?? clubError!} tone="danger" />
        ) : null}
        <Card accent={theme.colors.gold}>
          <View style={{ gap: theme.spacing.md }}>
            <StatusPill
              label={label}
              tone={label === 'Pending setup' ? 'warning' : 'danger'}
              icon="card-outline"
            />
            <AppText variant="section">
              Your club has not paid for this app. Please contact them to let
              them know.
            </AppText>
            {isPresident ? (
              <AppText color="muted">
                Your club billing account requires the President's attention.
              </AppText>
            ) : (
              <AppText color="muted">
                Ask your club President to update the club subscription.
              </AppText>
            )}
            {canManageOnWeb ? (
              <>
                <Button
                  label={actionLabel}
                  icon="card-outline"
                  loading={busy}
                  onPress={() => void manage()}
                />
                {access?.suspensionReason !== 'nonpayment' ? (
                  <Button
                    label="Use Monthly Invoices"
                    variant="secondary"
                    disabled={busy}
                    onPress={() => void activateManual()}
                  />
                ) : null}
              </>
            ) : isPresident ? (
              <FeedbackBanner
                message="Billing status is read-only in the mobile app."
              />
            ) : null}
          </View>
        </Card>
        <Card>
          <View style={{ gap: theme.spacing.sm }}>
            <AppText variant="cardTitle">Need help?</AppText>
            <AppText color="muted" selectable>
              For questions, contact {SUPPORT_EMAIL}.
            </AppText>
            <Button
              label="Email Support"
              icon="mail-outline"
              variant="secondary"
              onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            />
          </View>
        </Card>
        <Button
          label="Sign Out"
          icon="log-out-outline"
          variant="tertiary"
          onPress={() => void signOut()}
        />
      </View>
    </Screen>
  );
};

const webReturnUrl = (): string => {
  if (
    Platform.OS !== 'web' ||
    typeof window === 'undefined' ||
    !window.location?.origin
  ) {
    return '';
  }
  return `${window.location.origin}/subscription-required`;
};

export default SubscriptionRequired;
