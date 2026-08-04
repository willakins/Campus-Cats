import React, { useState } from 'react';
import { Alert, View } from 'react-native';

import { appModules } from '@/composition/appModules';
import { User, WhitelistApplication } from '@/core/domain';
import { useAppTheme } from '@/theme';

import { AppText, Button, Card, FeedbackBanner, StatusPill } from '../design';

interface WhitelistItemProps {
  readonly actor: User;
  readonly application: WhitelistApplication;
  readonly onChanged: () => void;
  readonly setBusy: (busy: boolean) => void;
}

export const WhitelistItem: React.FC<WhitelistItemProps> = ({
  actor,
  application,
  onChanged,
  setBusy,
}) => {
  const theme = useAppTheme();
  const [pending, setPending] = useState<'accept' | 'deny'>();
  const [error, setError] = useState<string>();

  const decide = async (decision: 'accept' | 'deny') => {
    if (pending) return;
    setPending(decision);
    setBusy(true);
    setError(undefined);
    const result =
      decision === 'accept'
        ? await appModules.whitelist.accept(actor, application.id)
        : await appModules.whitelist.deny(actor, application.id);
    setPending(undefined);
    setBusy(false);
    if (result.ok) onChanged();
    else setError(result.error.message);
  };

  const confirmDecision = (decision: 'accept' | 'deny') => {
    const isAccept = decision === 'accept';
    Alert.alert(
      isAccept ? 'Accept Application' : 'Deny Application',
      isAccept
        ? `Approve ${application.name} and create their account?`
        : `Deny and remove ${application.name}'s application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isAccept ? 'Accept' : 'Deny',
          style: isAccept ? 'default' : 'destructive',
          onPress: () => void decide(decision),
        },
      ],
    );
  };

  return (
    <Card accent={theme.colors.violet}>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ gap: theme.spacing.xxs }}>
          <AppText variant="cardTitle">{application.name}</AppText>
          <AppText color="muted" selectable>
            {application.email}
          </AppText>
          <StatusPill label="Pending review" tone="warning" icon="time-outline" />
        </View>
        <View style={{ gap: theme.spacing.xxs }}>
          <AppText>Graduation year: {application.graduationYear}</AppText>
          <AppText>Code word: {application.codeWord || 'Not provided'}</AppText>
        </View>
        {error ? <FeedbackBanner message={error} tone="danger" /> : null}
        <View style={{ flexDirection: 'row', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
          <Button
            label="Deny Application"
            variant="danger"
            loading={pending === 'deny'}
            disabled={Boolean(pending)}
            style={{ flexGrow: 1 }}
            onPress={() => confirmDecision('deny')}
          />
          <Button
            label="Accept Application"
            icon="checkmark-circle-outline"
            loading={pending === 'accept'}
            disabled={Boolean(pending)}
            style={{ flexGrow: 1 }}
            onPress={() => confirmDecision('accept')}
          />
        </View>
      </View>
    </Card>
  );
};
