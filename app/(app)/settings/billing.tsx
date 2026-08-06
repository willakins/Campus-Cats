import { useCallback, useState } from 'react';
import { Linking, View } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import {
  AccessDeniedState,
  AppHeader,
  AppText,
  Button,
  Card,
  CardListSkeleton,
  EmptyState,
  ErrorState,
  FeedbackBanner,
  FormSection,
  Screen,
  StatusPill,
} from '@/components/design';
import { appModules } from '@/composition/appModules';
import {
  canAccessCloudConsoles,
  canManageFeature,
  parseUser,
} from '@/core/domain';
import { BillingSetupReason, BillingSummary, MonthlyBillingCost } from '@/core/ports';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

const DEFAULT_PROJECT_ID = 'campuscats-d7a5e';

const Billing = () => {
  const router = useRouter();
  const { user } = useAuth();
  const actor = parseUser(user);
  const theme = useAppTheme();
  const authorized = canManageFeature(actor.role);
  const canOpenCloudConsoles = canAccessCloudConsoles(actor.role);
  const [summary, setSummary] = useState<BillingSummary>();
  const [loading, setLoading] = useState(authorized);
  const [error, setError] = useState<string>();

  const load = useCallback(() => {
    if (!authorized) return;
    setLoading(true);
    setError(undefined);
    void appModules.billing.summary(actor).then((result) => {
      setLoading(false);
      if (result.ok) setSummary(result.value);
      else setError(result.error.message);
    });
  }, [actor.id, authorized]);

  useFocusEffect(load);

  const projectId = summary?.projectId ?? DEFAULT_PROJECT_ID;
  const open = (url: string) => {
    void Linking.openURL(url).catch(() => {
      setError('Could not open the Google console link');
    });
  };

  return (
    <Screen scroll>
      <AppHeader
        title="App billing"
        eyebrow="Officer tools"
        onBack={() => router.back()}
      />
      {!authorized ? (
        <AccessDeniedState message="Only officers may view app billing." />
      ) : loading ? (
        <CardListSkeleton label="Loading app billing" layout="actions" />
      ) : error ? (
        <ErrorState
          title="Could not load app billing"
          message={error}
          onRetry={load}
        />
      ) : summary ? (
        <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xl }}>
          {canOpenCloudConsoles ? (
            <ConsoleLinks projectId={projectId} open={open} />
          ) : null}
          {summary.status === 'setup-required' ? (
            <SetupRequired
              summary={summary}
              open={open}
              canOpenCloudConsoles={canOpenCloudConsoles}
            />
          ) : (
            <MonthlyCosts summary={summary} />
          )}
        </View>
      ) : null}
    </Screen>
  );
};

const ConsoleLinks = ({
  projectId,
  open,
}: {
  readonly projectId: string;
  readonly open: (url: string) => void;
}) => {
  const theme = useAppTheme();
  return (
    <FormSection title="Cloud consoles">
      <Card accent={theme.colors.primary}>
        <View style={{ gap: theme.spacing.sm }}>
          <AppText color="muted">
            Firebase and Google Cloud share this project and billing account.
          </AppText>
          <Button
            label="Open Firebase Console"
            icon="open-outline"
            variant="secondary"
            onPress={() =>
              open(
                `https://console.firebase.google.com/project/${encodeURIComponent(projectId)}/overview`,
              )
            }
          />
          <Button
            label="Open Google Cloud Billing"
            icon="card-outline"
            variant="secondary"
            onPress={() =>
              open(
                `https://console.cloud.google.com/billing?project=${encodeURIComponent(projectId)}`,
              )
            }
          />
        </View>
      </Card>
    </FormSection>
  );
};

const SetupRequired = ({
  summary,
  open,
  canOpenCloudConsoles,
}: {
  readonly summary: Extract<BillingSummary, { readonly status: 'setup-required' }>;
  readonly open: (url: string) => void;
  readonly canOpenCloudConsoles: boolean;
}) => {
  const theme = useAppTheme();
  return (
    <FormSection title="Monthly costs">
      <FeedbackBanner
        tone="warning"
        message={setupMessage(summary.reason)}
      />
      <Card accent={theme.colors.gold}>
        <View style={{ gap: theme.spacing.sm }}>
          <StatusPill
            label="Setup required"
            tone="warning"
            icon="build-outline"
          />
          <AppText variant="cardTitle">Connect the billing export</AppText>
          <AppText color="muted">
            1. Enable the Standard usage cost export in Google Cloud Billing.
          </AppText>
          <AppText color="muted">
            2. Export it to {summary.exportProjectId}.{summary.datasetId} in the US location.
          </AppText>
          <AppText color="muted">
            3. Give the Functions service account BigQuery Job User and Data Viewer access.
          </AppText>
          <AppText color="muted">
            4. Return here after Google creates and populates the export table.
          </AppText>
          {canOpenCloudConsoles ? (
            <Button
              label="Set Up Billing Export"
              icon="open-outline"
              onPress={() =>
                open(
                  `https://console.cloud.google.com/billing/export?project=${encodeURIComponent(summary.projectId)}`,
                )
              }
            />
          ) : null}
        </View>
      </Card>
    </FormSection>
  );
};

const MonthlyCosts = ({
  summary,
}: {
  readonly summary: Extract<BillingSummary, { readonly status: 'ready' }>;
}) => {
  const theme = useAppTheme();
  const latest = summary.months[0];
  return (
    <FormSection title="Monthly costs">
      <FeedbackBanner
        message={
          summary.dataThrough
            ? `Billing data through ${formatDate(summary.dataThrough)}. Recent charges can take more than 24 hours to appear.`
            : 'Billing export is connected. Recent charges can take more than 24 hours to appear.'
        }
      />
      {latest ? (
        <Card accent={theme.colors.teal}>
          <View style={{ gap: theme.spacing.xs }}>
            <StatusPill label="Connected" tone="success" icon="cloud-done-outline" />
            <AppText color="muted">Latest month · {formatMonth(latest.month)}</AppText>
            <AppText variant="display">{formatMoney(latest.netCost, latest.currency)}</AppText>
            <AppText color="muted">Net cost after credits</AppText>
          </View>
        </Card>
      ) : null}
      {summary.months.length === 0 ? (
        <EmptyState
          title="No costs reported yet"
          message="The export is connected, but it has not reported any charges for this app project."
        />
      ) : (
        summary.months.map((month) => (
          <MonthlyCostCard key={`${month.month}-${month.currency}`} month={month} />
        ))
      )}
    </FormSection>
  );
};

const MonthlyCostCard = ({ month }: { readonly month: MonthlyBillingCost }) => {
  const theme = useAppTheme();
  return (
    <Card>
      <View style={{ gap: theme.spacing.sm }}>
        <AppText variant="cardTitle">{formatMonth(month.month)}</AppText>
        <CostRow label="Usage" value={formatMoney(month.grossCost, month.currency)} />
        <CostRow
          label="Credits"
          value={`−${formatMoney(month.credits, month.currency)}`}
          valueColor="primary"
        />
        <View style={{ height: 1, backgroundColor: theme.colors.border }} />
        <CostRow
          label="Net cost"
          value={formatMoney(month.netCost, month.currency)}
          emphasized
        />
      </View>
    </Card>
  );
};

const CostRow = ({
  label,
  value,
  emphasized = false,
  valueColor = 'default',
}: {
  readonly label: string;
  readonly value: string;
  readonly emphasized?: boolean;
  readonly valueColor?: 'default' | 'primary';
}) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
    <AppText color="muted">{label}</AppText>
    <AppText
      color={valueColor}
      variant={emphasized ? 'cardTitle' : 'body'}
      selectable
    >
      {value}
    </AppText>
  </View>
);

const setupMessage = (reason: BillingSetupReason) =>
  reason === 'access-denied'
    ? 'The billing export exists, but the app service account cannot read it yet.'
    : 'Google Cloud Billing is not exporting cost data to the expected BigQuery dataset yet.';

const formatMoney = (value: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);

const formatMonth = (value: string) => {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export default Billing;
