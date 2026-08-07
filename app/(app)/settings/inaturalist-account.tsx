import { useCallback, useState } from 'react';
import { Alert, Linking, View } from 'react-native';

import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import {
  AppHeader,
  AppText,
  Button,
  Card,
  CardListSkeleton,
  FeedbackBanner,
  FormSection,
  Screen,
  StatusPill,
} from '@/components/design';
import { appModules } from '@/composition/appModules';
import { InaturalistAccountLinkStatus, parseUser } from '@/core/domain';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

const APP_RETURN_URL = 'campuscats://settings/inaturalist-account';

const InaturalistAccount = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ readonly attempt?: string }>();
  const { user } = useAuth();
  const actor = parseUser(user);
  const theme = useAppTheme();
  const [status, setStatus] = useState<InaturalistAccountLinkStatus>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [feedback, setFeedback] = useState<string>();

  const load = useCallback(
    async (attemptId?: string) => {
      setLoading(true);
      setError(undefined);
      const result = await appModules.inaturalistAccounts.status(
        actor,
        attemptId ?? params.attempt,
      );
      setLoading(false);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setStatus(result.value);
      if (result.value.status === 'failed') {
        setFeedback(
          'The iNaturalist account could not be verified. Nothing was linked; please try again.',
        );
      }
    },
    [actor.id, params.attempt],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const connect = async () => {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    setFeedback(undefined);
    const result = await appModules.inaturalistAccounts.begin(actor);
    if (!result.ok) {
      setBusy(false);
      setError(result.error.message);
      return;
    }
    try {
      const browserResult = await WebBrowser.openAuthSessionAsync(
        result.value.authorizationUrl,
        APP_RETURN_URL,
        {
          dismissButtonStyle: 'cancel',
          enableDefaultShareMenuItem: false,
        },
      );
      if (browserResult.type === 'success') {
        await load(result.value.attemptId);
      }
    } catch {
      setError('Could not open the secure iNaturalist sign-in window.');
    }
    setBusy(false);
  };

  const unlink = () => {
    Alert.alert(
      'Unlink iNaturalist?',
      'Your imported iNaturalist sightings will remain visible, but they will no longer be associated with your Campus Cats profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: () => {
            setBusy(true);
            setError(undefined);
            void appModules.inaturalistAccounts.unlink(actor).then((result) => {
              setBusy(false);
              if (!result.ok) {
                setError(result.error.message);
                return;
              }
              setStatus({ status: 'unlinked' });
              setFeedback('Your iNaturalist account has been unlinked.');
            });
          },
        },
      ],
    );
  };

  const account = status?.status === 'linked' ? status.account : undefined;

  return (
    <Screen scroll>
      <AppHeader
        title="iNaturalist account"
        eyebrow="Profile connections"
        onBack={() => router.back()}
      />
      <View style={{ gap: theme.spacing.lg }}>
        {error ? <FeedbackBanner tone="danger" message={error} /> : null}
        {feedback ? <FeedbackBanner tone="info" message={feedback} /> : null}

        <FormSection title="Account connection">
          {loading ? (
            <CardListSkeleton label="Loading iNaturalist account status" />
          ) : account ? (
            <Card accent={theme.colors.primary}>
              <View style={{ gap: theme.spacing.sm }}>
                <StatusPill
                  label="Verified connection"
                  tone="success"
                  icon="checkmark-circle-outline"
                />
                <AppText variant="section">@{account.login}</AppText>
                <AppText color="muted">
                  Sightings from this iNaturalist account in the Georgia Tech
                  project are associated with your Campus Cats profile.
                </AppText>
                <Button
                  label="View on iNaturalist"
                  icon="open-outline"
                  variant="secondary"
                  onPress={() =>
                    void Linking.openURL(
                      `https://www.inaturalist.org/people/${encodeURIComponent(account.login)}`,
                    )
                  }
                />
                <Button
                  label="Unlink iNaturalist"
                  variant="danger"
                  loading={busy}
                  onPress={unlink}
                />
              </View>
            </Card>
          ) : (
            <Card accent={theme.colors.primary}>
              <View style={{ gap: theme.spacing.sm }}>
                <AppText variant="section">
                  Connect your iNaturalist account
                </AppText>
                <AppText color="muted">
                  Linking associates your Campus Cats profile with your existing
                  and future public observations imported from the Georgia Tech Cat
                  Sightings project.
                </AppText>
                <AppText color="muted">
                  Campus Cats will not import your other observations, see your
                  password, or keep an iNaturalist access token.
                </AppText>
                <Button
                  label="Connect iNaturalist"
                  icon="leaf-outline"
                  loading={busy}
                  onPress={() => void connect()}
                />
              </View>
            </Card>
          )}
        </FormSection>

        <FormSection title="How it works">
          <Card>
            <View style={{ gap: theme.spacing.xs }}>
              <AppText color="muted">
                iNaturalist asks you to approve identity-only access in its secure
                browser. Campus Cats verifies the account, immediately revokes the
                one-time authorization, and stores only the public numeric account ID
                and username needed for attribution.
              </AppText>
            </View>
          </Card>
        </FormSection>
      </View>
    </Screen>
  );
};

export default InaturalistAccount;
