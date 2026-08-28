import { Linking, View } from 'react-native';

import { useRouter } from 'expo-router';

import { AppHeader, AppText, Button, Card, Screen } from '@/components/design';
import { LEGAL_CONTACT_EMAIL } from '@/legal/policies';
import { useAppTheme } from '@/theme';

const AccountDeletionScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  };

  return (
    <Screen scroll>
      <AppHeader title="Delete your account" eyebrow="Privacy" onBack={goBack} />
      <View style={{ gap: theme.spacing.lg }}>
        <Card accent={theme.colors.danger} style={{ gap: theme.spacing.sm }}>
          <AppText variant="cardTitle">In-app deletion</AppText>
          <AppText>
            Sign in, open More → Account → Delete account, enter your account email,
            and confirm. A club President must transfer the presidency first.
          </AppText>
        </Card>

        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="section">If you cannot sign in</AppText>
          <AppText>
            Email us from the address associated with your Campus Cats account and ask
            for permanent account deletion. Include your club or university name. We
            may ask for additional information to verify that the account belongs to you.
          </AppText>
          <Button
            label="Request account deletion"
            icon="mail-outline"
            onPress={() =>
              void Linking.openURL(
                `mailto:${LEGAL_CONTACT_EMAIL}?subject=Campus%20Cats%20account%20deletion%20request`,
              )
            }
          />
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="section">What is deleted</AppText>
          <AppText>
            We remove your authentication account, profile, push token, personal media,
            authored sightings, comments, chat, reactions, survey and voting participation
            records, linked iNaturalist identity, and other account-linked personal data.
            Shared club records are retained only after your user ID and email are replaced
            with a generic deleted-account identity. Restricted backups and provider logs
            may retain residual copies temporarily under ordinary retention schedules.
          </AppText>
        </View>

        <Button
          label="Read the Privacy Policy"
          variant="secondary"
          onPress={() => router.push('/legal/privacy' as never)}
        />
      </View>
    </Screen>
  );
};

export default AccountDeletionScreen;
