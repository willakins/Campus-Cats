import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AuthTextField } from '@/presentation/auth';
import {
  AppText,
  Button,
  FeedbackBanner,
  IconButton,
  Screen,
} from '@/presentation/ui';
import { useAuth } from '@/presentation/providers';
import { useAppTheme } from '@/theme';

const ForgotPassword = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: 'info' | 'danger';
  }>();

  const sendPasswordReset = async () => {
    if (busy) return;
    try {
      setBusy(true);
      setFeedback(undefined);
      await requestPasswordReset(email);
      setFeedback({
        message:
          'If an account exists for that email, password-reset instructions are on the way.',
        tone: 'info',
      });
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : 'Could not send password-reset instructions. Please try again.',
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  };

  return (
    <Screen
      scroll
      keyboardAware
      contentStyle={{ paddingBottom: theme.spacing.huge }}
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
                width: 64,
                height: 64,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: theme.radii.card,
                backgroundColor: theme.colors.primarySurface,
              }}
            >
              <Ionicons
                name="key-outline"
                size={30}
                color={theme.colors.primary}
              />
            </View>
            <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
              <AppText
                accessibilityRole="header"
                variant="display"
                style={{ textAlign: 'center' }}
              >
                Reset your password
              </AppText>
              <AppText color="muted" style={{ textAlign: 'center' }}>
                Enter the email for your account and we’ll send you a reset
                link.
              </AppText>
            </View>
          </View>

          <View style={{ gap: theme.spacing.md }}>
            <AuthTextField
              label="Email"
              value={email}
              autoCapitalize="none"
              autoComplete="email"
              inputMode="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              onSubmitEditing={() => void sendPasswordReset()}
            />
            {feedback ? (
              <FeedbackBanner
                message={feedback.message}
                tone={feedback.tone}
              />
            ) : null}
            <Button
              label="Send reset link"
              icon="mail-outline"
              fullWidth
              loading={busy}
              loadingLabel="Sending reset link…"
              style={{ minHeight: 56 }}
              onPress={() => void sendPasswordReset()}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
};

export default ForgotPassword;
