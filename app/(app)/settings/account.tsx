import { useState } from 'react';
import { Alert, View } from 'react-native';

import { useRouter } from 'expo-router';

import { roleLabel } from '@/components/administration/rolePresentation';
import {
  AppHeader,
  AppText,
  Button,
  Card,
  FeedbackBanner,
  FormSection,
  IconButton,
  Screen,
  StatusPill,
} from '@/components/design';
import { FormTextInput } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import { Role, parseUser } from '@/core/domain';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

const Account = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const { signOut, user } = useAuth();
  const actor = parseUser(user);
  const [signingOut, setSigningOut] = useState(false);
  const [showDeletion, setShowDeletion] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string>();

  const logout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setError(undefined);
    try {
      await signOut();
      router.replace('/login');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please try again.');
      setSigningOut(false);
    }
  };

  const deleteAccount = () => {
    if (deleting || confirmation.trim().toLowerCase() !== actor.email.toLowerCase()) {
      return;
    }
    Alert.alert(
      'Permanently delete account?',
      'This cannot be undone. Your account and personal contributions will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            setDeleting(true);
            setError(undefined);
            void appModules.users
              .deleteOwnAccount(actor, confirmation)
              .then(async (result) => {
                if (!result.ok) {
                  setError(result.error.message);
                  setDeleting(false);
                  return;
                }
                await signOut().catch(() => undefined);
                router.replace('/login');
              });
          },
        },
      ],
    );
  };

  return (
    <Screen scroll>
      <AppHeader
        title="Account"
        eyebrow="Your Campus Cats account"
        onBack={() => router.back()}
        action={
          <IconButton
            accessibilityLabel="Sign out"
            accessibilityHint="Signs out of Campus Cats"
            icon="log-out-outline"
            variant="surface"
            disabled={signingOut}
            onPress={() => void logout()}
          />
        }
      />

      <View style={{ gap: theme.spacing.lg }}>
        {error ? <FeedbackBanner message={error} tone="danger" /> : null}

        <FormSection title="Campus Cats account">
          <Card accent={theme.colors.primary}>
            <View style={{ gap: theme.spacing.sm }}>
              <AppText variant="cardTitle" selectable>
                {actor.email}
              </AppText>
              <StatusPill
                label={roleLabel(actor.role)}
                tone={actor.role === Role.Member ? 'neutral' : 'primary'}
                icon={
                  actor.role === Role.Member
                    ? 'person-outline'
                    : 'shield-checkmark-outline'
                }
              />
              <Button
                label="View my profile"
                icon="person-circle-outline"
                variant="secondary"
                onPress={() =>
                  router.push({
                    pathname: '/profile/view-profile',
                    params: { id: actor.id },
                  })
                }
              />
            </View>
          </Card>
        </FormSection>

        <FormSection title="Delete account">
          <Card accent={theme.colors.danger} style={{ gap: theme.spacing.sm }}>
            <AppText variant="cardTitle">Permanently delete your account</AppText>
            <AppText color="muted">
              This removes your sign-in, profile, photos, sightings, comments, chat,
              reactions, and account-linked survey and voting records. Shared club records
              are kept only after your identity is removed.
            </AppText>
            {actor.role === Role.President ? (
              <FeedbackBanner
                message="Transfer the club presidency before deleting this account."
                tone="warning"
              />
            ) : showDeletion ? (
              <View style={{ gap: theme.spacing.sm }}>
                <FormTextInput
                  label="Confirm your account email"
                  helper={`Enter ${actor.email} to continue.`}
                  value={confirmation}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onChangeText={setConfirmation}
                />
                <Button
                  label="Permanently delete account"
                  variant="danger"
                  loading={deleting}
                  loadingLabel="Deleting account…"
                  disabled={
                    deleting ||
                    confirmation.trim().toLowerCase() !== actor.email.toLowerCase()
                  }
                  onPress={deleteAccount}
                />
                <Button
                  label="Cancel"
                  variant="tertiary"
                  disabled={deleting}
                  onPress={() => {
                    setShowDeletion(false);
                    setConfirmation('');
                  }}
                />
              </View>
            ) : (
              <Button
                label="Delete my account"
                variant="secondary"
                onPress={() => setShowDeletion(true)}
              />
            )}
          </Card>
        </FormSection>
      </View>
    </Screen>
  );
};

export default Account;
