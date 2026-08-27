import { Platform, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  canAccessRolePolicy,
  clubSubscriptionLabel,
  roleAccessPolicies,
} from '@/core/domain';
import { useAuth, useClub } from '@/providers';
import { useAppTheme } from '@/theme';
import { Button, FeedbackBanner } from '@/components/design';

export const SubscriptionBanner = () => {
  const { user } = useAuth();
  const { access } = useClub();
  const router = useRouter();
  const theme = useAppTheme();
  if (!access) return null;
  const label = clubSubscriptionLabel(access);
  if (label !== 'Lapsed' && label !== 'Ending') return null;
  const deadline = access.scheduledEndAt ?? access.graceEndsAt;
  const message =
    label === 'Ending'
      ? `This club's subscription ends${deadline ? ` on ${formatDate(deadline)}` : ''}.`
      : `The latest balance is unpaid. Pay${deadline ? ` before ${formatDate(deadline)}` : ' this month'} to prevent suspension.`;
  return (
    <View
      style={{
        gap: theme.spacing.xs,
        paddingHorizontal: theme.layout.screenGutter,
        paddingTop: theme.spacing.xs,
        backgroundColor: theme.colors.background,
      }}
    >
      <FeedbackBanner message={message} tone="warning" />
      {Platform.OS === 'web' &&
      canAccessRolePolicy(user.role, roleAccessPolicies.manageClubBilling) ? (
        <Button
          label="Manage Club Billing"
          size="small"
          variant="secondary"
          onPress={() => router.push('/settings/club-billing' as never)}
        />
      ) : null}
    </View>
  );
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
    new Date(value),
  );
