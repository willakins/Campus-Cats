import { useCallback, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';

import { RestrictedScreen } from '@/components/access';
import { useFocusTask } from '@/components/hooks/useFocusTask';
import {
  AppText,
  Button,
  Card,
  CardListSkeleton,
  ErrorState,
  FeedbackBanner,
  FormSection,
  StatusPill,
} from '@/components/design';
import { FormTextInput } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import {
  ClubAccess,
  ClubBillingSummary,
  clubIsInTrial,
  clubSubscriptionLabel,
  canAccessRolePolicy,
  roleAccessPolicies,
} from '@/core/domain';
import { useAuth, useClub } from '@/providers';
import { useAppTheme } from '@/theme';

const ClubBilling = () => {
  const { user } = useAuth();
  const { access } = useClub();
  const router = useRouter();
  const theme = useAppTheme();
  const authorized = canAccessRolePolicy(
    user.role,
    roleAccessPolicies.manageClubBilling,
  );
  const development = process.env.EXPO_PUBLIC_APP_ENV === 'development';
  const [summary, setSummary] = useState<ClubBillingSummary>();
  const [loading, setLoading] = useState(authorized);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [billingEmail, setBillingEmail] = useState('');

  const load = useCallback((isActive: () => boolean = () => true) => {
    if (!authorized || development || Platform.OS !== 'web') return;
    setLoading(true);
    setError(undefined);
    void appModules.clubBilling.summary(user).then((result) => {
      if (!isActive()) return;
      setLoading(false);
      if (result.ok) {
        setSummary(result.value);
        setBillingEmail(result.value.billingEmail);
      }
      else setError(result.error.message);
    });
  }, [authorized, development, user.id]);

  useFocusTask(load);

  const runRedirect = async (
    key: string,
    action: () => Promise<
      Awaited<ReturnType<typeof appModules.clubBilling.createPortalSession>>
    >,
  ) => {
    if (busy) return;
    setBusy(key);
    setError(undefined);
    const result = await action();
    setBusy(undefined);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await Linking.openURL(result.value.url).catch(() =>
      setError('Could not open secure billing.'),
    );
  };

  const setCollectionMethod = async (
    method: 'manual' | 'automatic',
  ) => {
    if (busy) return;
    setBusy(method);
    setError(undefined);
    const result = await appModules.clubBilling.setCollectionMethod(
      user,
      method,
      returnUrl(),
    );
    setBusy(undefined);
    if (!result.ok) {
      setError(result.error.message);
    } else if (result.value) {
      await Linking.openURL(result.value.url).catch(() =>
        setError('Could not open secure billing.'),
      );
    } else {
      load();
    }
  };

  const changeCancellation = async (cancel: boolean) => {
    if (busy) return;
    setBusy(cancel ? 'cancel' : 'resume');
    setError(undefined);
    const result = cancel
      ? await appModules.clubBilling.scheduleCancellation(user)
      : await appModules.clubBilling.resumeSubscription(user);
    setBusy(undefined);
    if (!result.ok) setError(result.error.message);
    else load();
  };

  const saveBillingEmail = async () => {
    if (busy || billingEmail.trim() === summary?.billingEmail) return;
    setBusy('billing-email');
    setError(undefined);
    const result = await appModules.clubBilling.updateBillingEmail(
      user,
      billingEmail,
    );
    setBusy(undefined);
    if (!result.ok) setError(result.error.message);
    else load();
  };

  return (
    <RestrictedScreen
      scroll
      title="Club billing"
      eyebrow="President tools"
      onBack={() => router.back()}
      access={{ policy: roleAccessPolicies.manageClubBilling, role: user.role }}
    >
      {development || Platform.OS !== 'web' ? (
        <NativeBillingStatus access={access} />
      ) : loading ? (
        <CardListSkeleton label="Loading club billing" layout="actions" />
      ) : error && !summary ? (
        <ErrorState
          title="Could not load club billing"
          message={error}
          onRetry={load}
        />
      ) : summary ? (
        <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xl }}>
          {error ? <FeedbackBanner message={error} tone="danger" /> : null}
          <FormSection title="Subscription">
            <Card accent={theme.colors.primary}>
              <View style={{ gap: theme.spacing.sm }}>
                <StatusPill
                  label={clubSubscriptionLabel(summary)}
                  tone={statusTone(summary)}
                  icon="card-outline"
                />
                <AppText variant="cardTitle">{summary.clubName}</AppText>
                <AppText color="muted">
                  {summary.collectionMethod === 'automatic'
                    ? `Automatic payment${summary.paymentMethodLabel ? ` · ${summary.paymentMethodLabel}` : ''}`
                    : 'Manual invoice payment'}
                </AppText>
                <BillingRow
                  label="Outstanding balance"
                  value={formatMoney(summary.outstandingBalance, summary.currency)}
                />
                {summary.graceEndsAt ? (
                  <FeedbackBanner
                    tone="warning"
                    message={`Pay before ${formatDate(summary.graceEndsAt)} to prevent suspension.`}
                  />
                ) : null}
                {summary.invoiceDueAt &&
                summary.paymentStanding === 'current' ? (
                  <FeedbackBanner
                    message={`The current invoice is due ${formatDate(summary.invoiceDueAt)}.`}
                  />
                ) : null}
                {summary.scheduledEndAt ? (
                  <FeedbackBanner
                    tone="warning"
                    message={`Access is scheduled to end ${formatDate(summary.scheduledEndAt)}.`}
                  />
                ) : null}
                {clubIsInTrial(summary) ? (
                  <FeedbackBanner
                    message={trialStatusMessage(summary)}
                  />
                ) : null}
              </View>
            </Card>
          </FormSection>

          <FormSection title="Current usage">
            <Card>
              <View style={{ gap: theme.spacing.xs }}>
                <AppText variant="cardTitle">
                  {formatDate(summary.currentUsage.periodStartsAt)} –{' '}
                  {formatDate(summary.currentUsage.periodEndsAt)}
                </AppText>
                <BillingRow
                  label="Activity units"
                  value={`${summary.currentUsage.activityUnits.toLocaleString()} · ${summary.activityUnitPriceLabel}`}
                />
                <BillingRow
                  label="Uploaded media"
                  value={`${formatMedia(summary.currentUsage.mediaBytes)} · ${summary.mediaMegabytePriceLabel}`}
                />
              </View>
            </Card>
          </FormSection>

          <FormSection title="Payment controls">
            {summary.invoices.some(({ status }) => status === 'open') ? (
              <Button
                label="Pay Outstanding Invoice"
                icon="card-outline"
                loading={busy === 'pay'}
                onPress={() =>
                  void runRedirect('pay', () =>
                    appModules.clubBilling.payOutstandingInvoice(user),
                  )
                }
              />
            ) : null}
            {summary.accessState === 'pending_setup' ? (
              <View style={{ gap: theme.spacing.sm }}>
                <FeedbackBanner message="Add a card to start your free trial. It will not be charged during the first 30 days." />
                <Button
                  label="Start 30-Day Free Trial"
                  icon="wallet-outline"
                  loading={busy === 'setup'}
                  onPress={() =>
                    void runRedirect('setup', () =>
                      appModules.clubBilling.createSetupSession(user, returnUrl()),
                    )
                  }
                />
              </View>
            ) : summary.accessState === 'suspended' &&
              summary.suspensionReason === 'cancellation' ? (
              <>
                <Button
                  label="Restart with Automatic Payments"
                  icon="repeat-outline"
                  loading={busy === 'automatic'}
                  onPress={() => void setCollectionMethod('automatic')}
                />
                <Button
                  label="Restart with Monthly Invoices"
                  variant="secondary"
                  loading={busy === 'manual'}
                  onPress={() => void setCollectionMethod('manual')}
                />
              </>
            ) : summary.accessState === 'suspended' ? null : clubIsInTrial(summary) ? null : summary.collectionMethod === 'manual' ? (
              <Button
                label="Turn On Automatic Payments"
                icon="repeat-outline"
                loading={busy === 'automatic'}
                onPress={() => void setCollectionMethod('automatic')}
              />
            ) : (
              <Button
                label="Switch to Manual Invoices"
                variant="secondary"
                loading={busy === 'manual'}
                onPress={() => void setCollectionMethod('manual')}
              />
            )}
            {summary.accessState !== 'pending_setup' ? (
              <Button
                label="Open Invoice and Payment History"
                icon="open-outline"
                variant="secondary"
                loading={busy === 'portal'}
                onPress={() =>
                  void runRedirect('portal', () =>
                    appModules.clubBilling.createPortalSession(user, returnUrl()),
                  )
                }
              />
            ) : null}
            {summary.scheduledEndAt ? (
              <Button
                label="Keep Subscription"
                variant="secondary"
                loading={busy === 'resume'}
                onPress={() => void changeCancellation(false)}
              />
            ) : summary.accessState === 'enabled' ? (
              <Button
                label="Cancel at Month End"
                variant="danger"
                loading={busy === 'cancel'}
                onPress={() => void changeCancellation(true)}
              />
            ) : null}
          </FormSection>

          <FormSection title="Billing contact">
            <FormTextInput
              label="Billing contact email"
              helper="Invoices and payment notices also go to the club President."
              value={billingEmail}
              autoCapitalize="none"
              autoComplete="email"
              inputMode="email"
              keyboardType="email-address"
              onChangeText={setBillingEmail}
            />
            <Button
              label="Save Billing Contact"
              variant="secondary"
              loading={busy === 'billing-email'}
              disabled={billingEmail.trim() === summary.billingEmail}
              onPress={() => void saveBillingEmail()}
            />
          </FormSection>

          <FormSection title="Invoices">
            {summary.invoices.length ? (
              summary.invoices.map((invoice) => (
                <Card key={invoice.id}>
                  <View style={{ gap: theme.spacing.xs }}>
                    <BillingRow
                      label={invoice.number ?? 'Invoice'}
                      value={formatMoney(invoice.amountDue, invoice.currency)}
                    />
                    <BillingRow
                      label={formatDate(invoice.createdAt)}
                      value={invoice.status.toUpperCase()}
                    />
                    {invoice.hostedInvoiceUrl ? (
                      <Button
                        label="View Invoice"
                        size="small"
                        variant="tertiary"
                        onPress={() =>
                          void Linking.openURL(invoice.hostedInvoiceUrl!)
                        }
                      />
                    ) : null}
                  </View>
                </Card>
              ))
            ) : (
              <FeedbackBanner message="No invoices have been issued yet." />
            )}
          </FormSection>

          <AppText color="muted" selectable>
            Billing notices are sent to {summary.billingEmail}. For help,
            contact willakins23@gmail.com.
          </AppText>
        </View>
      ) : null}
    </RestrictedScreen>
  );
};

const NativeBillingStatus = ({ access }: { readonly access?: ClubAccess }) => {
  const theme = useAppTheme();
  const development =
    process.env.EXPO_PUBLIC_APP_ENV === 'development';
  if (!access) {
    return (
      <ErrorState
        title="Could not load club billing"
        message="Your club subscription status is unavailable."
      />
    );
  }
  const label = clubSubscriptionLabel(access);
  return (
    <View style={{ gap: theme.spacing.lg }}>
      <Card accent={theme.colors.primary}>
        <View style={{ gap: theme.spacing.sm }}>
          <StatusPill
            label={label}
            tone={statusTone(access)}
            icon="card-outline"
          />
          <AppText variant="cardTitle">{access.clubName}</AppText>
          <AppText color="muted">
            {development
              ? 'Billing disabled in development'
              : access.collectionMethod === 'automatic'
              ? 'Automatic payment'
              : 'Manual invoice payment'}
          </AppText>
          {access.graceEndsAt ? (
            <FeedbackBanner
              tone="warning"
              message={`The latest balance is unpaid. Payment is required before ${formatDate(access.graceEndsAt)} to prevent suspension.`}
            />
          ) : null}
          {access.scheduledEndAt ? (
            <FeedbackBanner
              tone="warning"
              message={`Access is scheduled to end ${formatDate(access.scheduledEndAt)}.`}
            />
          ) : null}
          {clubIsInTrial(access) ? (
            <FeedbackBanner
              message={
                development
                  ? `Your development trial ends ${formatDate(access.trialEndsAt!)}. It will not convert to paid usage.`
                  : trialStatusMessage(access)
              }
            />
          ) : null}
        </View>
      </Card>
      <FeedbackBanner
        message={
          development
            ? 'This development build cannot create payments or invoices.'
            : 'Club billing is read-only in the mobile app. A club President can manage payment on the web.'
        }
      />
    </View>
  );
};

const BillingRow = ({ label, value }: { label: string; value: string }) => (
  <View
    style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 16,
    }}
  >
    <AppText color="muted">{label}</AppText>
    <AppText selectable style={{ textAlign: 'right', flexShrink: 1 }}>
      {value}
    </AppText>
  </View>
);

const statusTone = (
  summary: ClubAccess,
): 'success' | 'warning' | 'danger' =>
  summary.accessState === 'suspended'
    ? 'danger'
    : summary.paymentStanding === 'past_due' || summary.scheduledEndAt
      ? 'warning'
      : 'success';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
    new Date(value),
  );
const trialStatusMessage = (access: ClubAccess): string =>
  access.scheduledEndAt
    ? `Your free trial ends ${formatDate(access.trialEndsAt!)}. Your subscription is scheduled to end without moving to paid usage.`
    : `Your free trial ends ${formatDate(access.trialEndsAt!)}. Paid usage begins automatically afterward.`;
const formatMedia = (bytes: number) =>
  `${Math.ceil(bytes / 1_000_000).toLocaleString()} MB`;
const formatMoney = (cents: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
const returnUrl = () =>
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? `${window.location.origin}/settings/club-billing`
    : '';

export default ClubBilling;
