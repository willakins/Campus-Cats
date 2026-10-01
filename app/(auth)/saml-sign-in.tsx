import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  AppText,
  Button,
  FeedbackBanner,
  IconButton,
  Screen,
} from '@/presentation/ui';
import { appModules } from '@/composition/appModules';
import { useAuth, useUniversitySelection } from '@/presentation/providers';
import { useAppTheme } from '@/theme';
import { requestPushNotificationToken } from '@/adapters/expo/pushNotifications';

const SamlSignIn = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const { samlSignIn } = useAuth();
  const { university } = useUniversitySelection();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: 'info' | 'danger';
  }>();

  const signIn = async () => {
    if (busy) return;
    try {
      setBusy(true);
      setFeedback(undefined);
      const result = await samlSignIn();
      if (result.status === 'cancelled') {
        setFeedback({
          message: 'Sign-in was cancelled. You can try again.',
          tone: 'info',
        });
        return;
      }
      const token = await requestPushNotificationToken();
      if (token) await appModules.session.registerPushToken(token);
      router.replace('/(app)/(tabs)');
    } catch (error) {
      setFeedback({
        message: error instanceof Error ? error.message : 'Please try again.',
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  };

  const signInRef = useRef(signIn);
  signInRef.current = signIn;

  useEffect(() => {
    if (!university?.club?.saml) return;
    void signInRef.current();
  }, [university?.club?.saml]);

  if (!university?.club?.saml) return <Redirect href="/login" />;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  };

  return (
    <Screen
      contentStyle={{
        paddingBottom: theme.spacing.lg,
      }}
    >
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: theme.layout.maxAuthWidth,
          alignSelf: 'center',
        }}
      >
        <IconButton
          accessibilityLabel="Back"
          icon="arrow-back"
          disabled={busy}
          onPress={goBack}
        />

        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            gap: theme.spacing.xl,
            paddingBottom: theme.spacing.huge,
          }}
        >
          <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
            <View
              style={{
                width: 72,
                height: 72,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: theme.radii.card,
                backgroundColor: theme.colors.primarySurface,
              }}
            >
              <Ionicons
                name="school-outline"
                size={34}
                color={theme.colors.primary}
              />
            </View>
            <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
              <AppText
                accessibilityRole="header"
                variant="display"
                style={{ textAlign: 'center' }}
              >
                Sign in with Georgia Tech
              </AppText>
              <AppText color="muted" style={{ textAlign: 'center' }}>
                Use your Georgia Tech account to securely continue to Campus
                Cats.
              </AppText>
            </View>
          </View>

          <View style={{ gap: theme.spacing.md }}>
            {feedback ? (
              <FeedbackBanner message={feedback.message} tone={feedback.tone} />
            ) : null}
            <Button
              label={feedback ? 'Retry Georgia Tech SSO' : 'Continue to SSO'}
              icon="school-outline"
              fullWidth
              loading={busy}
              loadingLabel="Opening Georgia Tech SSO…"
              style={{ minHeight: 56 }}
              onPress={() => void signIn()}
            />
            <AppText
              variant="caption"
              color="muted"
              style={{ textAlign: 'center' }}
            >
              You’ll return to Campus Cats after signing in.
            </AppText>
          </View>
        </View>
      </View>
    </Screen>
  );
};

export default SamlSignIn;
