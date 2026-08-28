import { useCallback, useState } from 'react';
import { Linking, View } from 'react-native';

import { useRouter } from 'expo-router';

import { RestrictedScreen } from '@/components/access';
import { useFocusTask } from '@/components/hooks/useFocusTask';
import {
  AppText,
  Button,
  Card,
  CardListSkeleton,
  EmptyState,
  ErrorState,
  FeedbackBanner,
  FormSection,
  StatusPill,
} from '@/components/design';
import { appModules } from '@/composition/appModules';
import {
  canAccessRolePolicy,
  parseUser,
  roleAccessPolicies,
} from '@/core/domain';
import {
  BillingProviderPresentation,
  BillingSummary,
  MonthlyBillingCost,
} from '@/core/ports';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

const Billing = () => {
  const router = useRouter();
  const { user } = useAuth();
  const actor = parseUser(user);
  const theme = useAppTheme();
  const billingAccessPolicy = roleAccessPolicies.viewInfrastructureCosts;
  const authorized = canAccessRolePolicy(actor.role, billingAccessPolicy);
  const production = process.env.EXPO_PUBLIC_APP_ENV === 'production';
  const canOpenCloudConsoles = authorized;
  const presentation = appModules.billing.presentation;
  const [summary, setSummary] = useState<BillingSummary>();
  const [loading, setLoading] = useState(authorized && production);
  const [error, setError] = useState<string>();

  const load = useCallback((isActive: () => boolean = () => true) => {
    if (!authorized || !production) return;
    setLoading(true);
    setError(undefined);
    void appModules.billing.summary(actor).then((result) => {
      if (!isActive()) return;
      setLoading(false);
      if (result.ok) setSummary(result.value);
      else setError(result.error.message);
    });
  }, [actor.id, authorized, production]);

  useFocusTask(load);

  const open = (url: string) => {
    void Linking.openURL(url).catch(() => {
      setError('Could not open the cloud console link');
    });
  };

  return (
    <RestrictedScreen
      scroll
      title="Infrastructure costs"
      eyebrow="Platform administration"
      onBack={() => router.back()}
      access={{ policy: billingAccessPolicy, role: actor.role }}
    >
      {!production ? (
        <EmptyState
          title="Infrastructure costs are only available in production"
          message="Open the production app to review Firebase and Google Cloud costs."
        />
      ) : loading ? (
        <CardListSkeleton label="Loading app billing" layout="actions" />
      ) : error ? (
        <ErrorState
          title="Could not load app billing"
          message={error}
          onRetry={load}
        />
      ) : summary ? (
        <View
          style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xl }}
        >
          {canOpenCloudConsoles ? (
            <ConsoleLinks
              presentation={presentation}
              projectId={summary.projectId}
              open={open}
            />
          ) : null}
          {summary.status === 'setup-required' ? (
            <SetupRequired
              summary={summary}
              presentation={presentation}
              open={open}
              canOpenCloudConsoles={canOpenCloudConsoles}
            />
          ) : (
            <MonthlyCosts summary={summary} />
          )}
        </View>
      ) : null}
    </RestrictedScreen>
  );
};

const ConsoleLinks = ({
  presentation,
  projectId,
  open,
}: {
  readonly presentation: BillingProviderPresentation;
  readonly projectId: string;
  readonly open: (url: string) => void;
}) => {
  const theme = useAppTheme();
  const links = presentation.consoleLinks(projectId);
  return (
    <FormSection title="Cloud consoles">
      <Card accent={theme.colors.primary}>
        <View style={{ gap: theme.spacing.sm }}>
          <AppText color="muted">{presentation.consoleDescription}</AppText>
          {links.map((link) => (
            <Button
              key={link.url}
              label={link.label}
              icon="open-outline"
              variant="secondary"
              onPress={() => open(link.url)}
            />
          ))}
        </View>
      </Card>
    </FormSection>
  );
};

const SetupRequired = ({
  summary,
  presentation,
  open,
  canOpenCloudConsoles,
}: {
  readonly summary: Extract<
    BillingSummary,
    { readonly status: 'setup-required' }
  >;
  readonly presentation: BillingProviderPresentation;
  readonly open: (url: string) => void;
  readonly canOpenCloudConsoles: boolean;
}) => {
  const theme = useAppTheme();
  const setup = presentation.setup(summary);
  return (
    <FormSection title="Monthly costs">
      <FeedbackBanner tone="warning" message={setup.message} />
      <Card accent={theme.colors.gold}>
        <View style={{ gap: theme.spacing.sm }}>
          <StatusPill
            label="Setup required"
            tone="warning"
            icon="build-outline"
          />
          <AppText variant="cardTitle">{setup.title}</AppText>
          {setup.steps.map((step, index) => (
            <AppText key={step} color="muted">
              {index + 1}. {step}
            </AppText>
          ))}
          {canOpenCloudConsoles && setup.action ? (
            <Button
              label={setup.action.label}
              icon="open-outline"
              onPress={() => open(setup.action!.url)}
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
            <StatusPill
              label="Connected"
              tone="success"
              icon="cloud-done-outline"
            />
            <AppText color="muted">
              Latest month · {formatMonth(latest.month)}
            </AppText>
            <AppText variant="display">
              {formatMoney(latest.netCost, latest.currency)}
            </AppText>
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
          <MonthlyCostCard
            key={`${month.month}-${month.currency}`}
            month={month}
          />
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
        <CostRow
          label="Usage"
          value={formatMoney(month.grossCost, month.currency)}
        />
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
  <View
    style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}
  >
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
