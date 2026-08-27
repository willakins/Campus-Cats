import { useState } from 'react';
import { View } from 'react-native';

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
import { Role, parseUser } from '@/core/domain';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

const Account = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const { signOut, user } = useAuth();
  const actor = parseUser(user);
  const [signingOut, setSigningOut] = useState(false);
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

        <FormSection title="Connected accounts">
          <Card accent={theme.colors.success}>
            <View style={{ gap: theme.spacing.sm }}>
              <AppText variant="cardTitle">iNaturalist</AppText>
              <AppText color="muted">
                Connect your Campus Cats account to iNaturalist so imported
                observations can link back to your member profile.
              </AppText>
              <Button
                label="Manage iNaturalist connection"
                icon="leaf-outline"
                variant="secondary"
                onPress={() =>
                  router.push('/settings/inaturalist-account' as never)
                }
              />
            </View>
          </Card>
        </FormSection>
      </View>
    </Screen>
  );
};

export default Account;
