import React, { useState } from 'react';
import { Alert, View } from 'react-native';

import { appModules } from '@/composition/appModules';
import { Role, User, canManageUser } from '@/core/domain';
import { useAppTheme } from '@/theme';

import { roleLabel } from '../administration/rolePresentation';
import { AppText, Button, Card, FeedbackBanner, StatusPill } from '../design';

interface UserItemProps {
  readonly actor: User;
  readonly user: User;
  readonly onChanged: () => void;
}

type UserAction = 'promote' | 'demote' | 'remove';

export const UserItem: React.FC<UserItemProps> = ({ actor, user, onChanged }) => {
  const theme = useAppTheme();
  const canManage = canManageUser(actor, user);
  const [pending, setPending] = useState<UserAction>();
  const [error, setError] = useState<string>();

  const run = async (action: UserAction) => {
    if (pending) return;
    setPending(action);
    setError(undefined);
    const result =
      action === 'promote'
        ? await appModules.users.promote(actor, user.id)
        : action === 'demote'
          ? await appModules.users.demote(actor, user.id)
          : await appModules.users.remove(actor, user.id);
    setPending(undefined);
    if (result.ok) onChanged();
    else setError(result.error.message);
  };

  const confirmRoleChange = (action: 'promote' | 'demote') => {
    const isPromotion = action === 'promote';
    const title = isPromotion ? 'Promote User' : 'Demote User';
    const nextRole = (user.role + (isPromotion ? 1 : -1)) as Role;
    Alert.alert(title, `${isPromotion ? 'Promote' : 'Demote'} ${user.email} to ${roleLabel(nextRole)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: isPromotion ? 'Promote' : 'Demote',
        onPress: () => void run(action),
      },
    ]);
  };

  const confirmRemove = () =>
    Alert.alert('Remove User', `Remove ${user.email} from Campus Cats?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => void run('remove'),
      },
    ]);

  return (
    <Card accent={theme.colors.violet}>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ gap: theme.spacing.xxs }}>
          <AppText variant="cardTitle" selectable>
            {user.email}
          </AppText>
          <StatusPill
            label={roleLabel(user.role)}
            tone={user.role === Role.Member ? 'neutral' : 'primary'}
            icon={user.role === Role.Member ? 'person-outline' : 'shield-checkmark-outline'}
          />
        </View>
        {error ? <FeedbackBanner message={error} tone="danger" /> : null}
        {canManage ? (
          <View style={{ gap: theme.spacing.xs }}>
            {user.role < Role.SuperAdmin ? (
              <Button
                label="Promote User"
                icon="arrow-up-circle-outline"
                variant="secondary"
                loading={pending === 'promote'}
                disabled={Boolean(pending)}
                onPress={() => confirmRoleChange('promote')}
              />
            ) : null}
            {user.role > Role.Member ? (
              <Button
                label="Demote User"
                icon="arrow-down-circle-outline"
                variant="secondary"
                loading={pending === 'demote'}
                disabled={Boolean(pending)}
                onPress={() => confirmRoleChange('demote')}
              />
            ) : null}
            <Button
              label="Remove User"
              icon="person-remove-outline"
              variant="danger"
              loading={pending === 'remove'}
              disabled={Boolean(pending)}
              onPress={confirmRemove}
            />
          </View>
        ) : (
          <AppText color="muted" variant="caption">
            You cannot manage yourself or someone with an equal or higher role.
          </AppText>
        )}
      </View>
    </Card>
  );
};
