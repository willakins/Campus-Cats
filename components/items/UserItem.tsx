import React, { useState } from 'react';
import { Alert, View } from 'react-native';

import { appModules } from '@/composition/appModules';
import {
  ManagedUser,
  Role,
  User,
  canChangeUserRole,
  canDisciplineUser,
  canManageUser,
  canTransferPresidency,
} from '@/core/domain';
import { useAppTheme } from '@/theme';

import { roleLabel } from '../administration/rolePresentation';
import { AppText, Button, Card, FeedbackBanner, StatusPill } from '../design';
import { FormTextInput } from '../forms';

interface UserItemProps {
  readonly actor: User;
  readonly user: ManagedUser;
  readonly onChanged: () => void;
  readonly hasPresident?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly onPresidencyTransferred?: () => void;
}

type UserAction =
  | 'promote'
  | 'demote'
  | 'remove'
  | 'crown'
  | 'discipline'
  | 'ban'
  | 'unban';

export const UserItem = React.memo(function UserItem({
  actor,
  user,
  onChanged,
  hasPresident = false,
  disabled = false,
  readOnly = false,
  onPresidencyTransferred,
}: UserItemProps) {
  const theme = useAppTheme();
  const promotedRole = user.role < Role.VicePresident
    ? (user.role + 1) as Role
    : undefined;
  const demotedRole = user.role > Role.Member && user.role <= Role.VicePresident
    ? (user.role - 1) as Role
    : undefined;
  const canPromote = !user.banned && promotedRole !== undefined &&
    canChangeUserRole(actor, user, promotedRole);
  const canDemote = !user.banned && demotedRole !== undefined &&
    canChangeUserRole(actor, user, demotedRole);
  const canRemove = canManageUser(actor, user) && user.role < Role.President;
  const canCrown = canTransferPresidency(actor, user, hasPresident);
  const canDiscipline = canDisciplineUser(actor, user);
  const [pending, setPending] = useState<UserAction>();
  const [error, setError] = useState<string>();
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const run = async (action: UserAction) => {
    if (pending) return;
    setPending(action);
    setError(undefined);
    const result =
      action === 'promote'
        ? await appModules.users.promote(actor, user.id)
        : action === 'demote'
          ? await appModules.users.demote(actor, user.id)
          : action === 'remove'
            ? await appModules.users.remove(actor, user.id)
            : action === 'crown'
              ? await appModules.users.transferPresidency(
                actor,
                user.id,
                hasPresident,
              )
              : action === 'discipline'
                ? await appModules.users.addDisciplinaryNotice(
                  actor,
                  user.id,
                  notice,
                )
                : await appModules.users.setBanned(
                  actor,
                  user.id,
                  action === 'ban',
                );
    setPending(undefined);
    if (result.ok) {
      onChanged();
      if (action === 'crown') onPresidencyTransferred?.();
      if (action === 'discipline') {
        setNotice('');
        setNoticeOpen(false);
      }
    }
    else setError(result.error.message);
  };

  const confirmBanChange = () => {
    const action: 'ban' | 'unban' = user.banned ? 'unban' : 'ban';
    const title = user.banned ? 'Unban User' : 'Ban User';
    const message = user.banned
      ? `Restore login access for ${user.email}?`
      : `Ban ${user.email}? They will be signed out and unable to log in until a power-role user unbans them.`;
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: title,
        style: user.banned ? 'default' : 'destructive',
        onPress: () => void run(action),
      },
    ]);
  };

  const confirmRoleChange = (action: 'promote' | 'demote') => {
    const isPromotion = action === 'promote';
    const nextRole = isPromotion ? promotedRole : demotedRole;
    if (nextRole === undefined) return;
    const title = `${isPromotion ? 'Promote' : 'Demote'} to ${roleLabel(nextRole)}`;
    Alert.alert(title, `${isPromotion ? 'Promote' : 'Demote'} ${user.email} to ${roleLabel(nextRole)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: title,
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

  const confirmPresidency = () => {
    const outgoingMessage = actor.role === Role.President
      ? 'This cannot be undone from your account. You will immediately become an Officer and lose presidential authority.'
      : 'This creates the first President. Afterward, only that President can transfer the presidency.';
    Alert.alert(
      'Crown New President',
      `${user.email} will become President. ${outgoingMessage}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Crown New President',
          style: 'destructive',
          onPress: () => void run('crown'),
        },
      ],
    );
  };

  return (
    <Card accent={theme.colors.violet}>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ gap: theme.spacing.xxs }}>
          <AppText variant="cardTitle" selectable>
            {user.email}
          </AppText>
          <View style={{ flexDirection: 'row', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
            <StatusPill
              label={roleLabel(user.role)}
              tone={user.role === Role.Member ? 'neutral' : 'primary'}
              icon={user.role === Role.Member ? 'person-outline' : 'shield-checkmark-outline'}
            />
            {user.banned ? (
              <StatusPill label="Banned" tone="danger" icon="ban-outline" />
            ) : null}
          </View>
        </View>
        {user.disciplinaryNotices.length > 0 ? (
          <View style={{ gap: theme.spacing.xs }}>
            <AppText variant="label">
              {user.disciplinaryNotices.length === 1
                ? '1 disciplinary notice'
                : `${user.disciplinaryNotices.length} disciplinary notices`}
            </AppText>
            {[...user.disciplinaryNotices]
              .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
              .map((disciplinaryNotice) => (
                <View
                  key={disciplinaryNotice.id}
                  style={{
                    gap: theme.spacing.xxs,
                    padding: theme.spacing.sm,
                    borderRadius: theme.radii.field,
                    backgroundColor: theme.colors.warningSurface,
                  }}
                >
                  <AppText>{disciplinaryNotice.message}</AppText>
                  <AppText color="muted" variant="caption">
                    {disciplinaryNotice.issuedByEmail} ·{' '}
                    {disciplinaryNotice.createdAt.toLocaleDateString()}
                  </AppText>
                </View>
              ))}
          </View>
        ) : null}
        {error ? <FeedbackBanner message={error} tone="danger" /> : null}
        {noticeOpen && canDiscipline ? (
          <View style={{ gap: theme.spacing.xs }}>
            <FormTextInput
              label="Disciplinary notice"
              helper="Describe the policy violation. This notice becomes part of the account history."
              placeholder="Posted an inappropriate image"
              value={notice}
              onChangeText={setNotice}
              maxLength={500}
              multiline
            />
            <View style={{ flexDirection: 'row', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
              <Button
                label="Save Discipline Notice"
                icon="document-text-outline"
                loading={pending === 'discipline'}
                disabled={!notice.trim() || Boolean(pending)}
                size="small"
                onPress={() => void run('discipline')}
              />
              <Button
                label="Cancel Discipline Notice"
                variant="tertiary"
                disabled={Boolean(pending)}
                size="small"
                onPress={() => {
                  setNotice('');
                  setNoticeOpen(false);
                }}
              />
            </View>
          </View>
        ) : null}
        {readOnly ? null : canPromote || canDemote || canCrown || canRemove || canDiscipline ? (
          <View style={{ flexDirection: 'row', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
            {canPromote && promotedRole !== undefined ? (
              <Button
                label={`Promote to ${roleLabel(promotedRole)}`}
                icon="arrow-up-circle-outline"
                variant="secondary"
                loading={pending === 'promote'}
                disabled={disabled || Boolean(pending)}
                size="small"
                onPress={() => confirmRoleChange('promote')}
              />
            ) : null}
            {canDemote && demotedRole !== undefined ? (
              <Button
                label={`Demote to ${roleLabel(demotedRole)}`}
                icon="arrow-down-circle-outline"
                variant="secondary"
                loading={pending === 'demote'}
                disabled={disabled || Boolean(pending)}
                size="small"
                onPress={() => confirmRoleChange('demote')}
              />
            ) : null}
            {canCrown ? (
              <Button
                label="Crown New President"
                icon="ribbon-outline"
                variant="danger"
                loading={pending === 'crown'}
                disabled={disabled || Boolean(pending)}
                size="small"
                onPress={confirmPresidency}
              />
            ) : null}
            {canDiscipline && !noticeOpen ? (
              <Button
                label="Add Discipline Notice"
                icon="document-text-outline"
                variant="secondary"
                disabled={disabled || Boolean(pending)}
                size="small"
                onPress={() => setNoticeOpen(true)}
              />
            ) : null}
            {canDiscipline ? (
              <Button
                label={user.banned ? 'Unban User' : 'Ban User'}
                icon={user.banned ? 'checkmark-circle-outline' : 'ban-outline'}
                variant={user.banned ? 'secondary' : 'danger'}
                loading={pending === (user.banned ? 'unban' : 'ban')}
                disabled={disabled || Boolean(pending)}
                size="small"
                onPress={confirmBanChange}
              />
            ) : null}
            {canRemove ? (
              <Button
                label="Remove User"
                icon="person-remove-outline"
                variant="tertiary"
                loading={pending === 'remove'}
                disabled={disabled || Boolean(pending)}
                size="small"
                onPress={confirmRemove}
              />
            ) : null}
          </View>
        ) : (
          <AppText color="muted" variant="caption">
            {user.role >= Role.President
              ? 'This protected role cannot be changed with ordinary user controls.'
              : 'Your role cannot promote or demote this account.'}
          </AppText>
        )}
      </View>
    </Card>
  );
});
