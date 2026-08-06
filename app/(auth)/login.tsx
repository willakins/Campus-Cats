import React, { useState } from 'react';
import { useRouter } from 'expo-router';

import { AuthScaffold, AuthTextField } from '@/components/auth';
import { AppText, Button, FeedbackBanner } from '@/components/design';
import { appModules } from '@/composition/appModules';
import { useAuth } from '@/providers';
import { registerForPushNotificationsAsync } from '@/utils/notifications';

const LoginScreen = () => {
  const router = useRouter();
  const { login } = useAuth();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: 'info' | 'danger';
  }>();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const handleChange = (field: 'email' | 'password', value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const loginWhitelistUser = async () => {
    if (busy) return;
    try {
      setBusy(true);
      setFeedback(undefined);
      await login(formData.email, formData.password);
      const token = await registerForPushNotificationsAsync();
      if (token) await appModules.session.registerPushToken(token);
      router.replace('/(app)/(tabs)');
    } catch (error) {
      setFeedback({
        message: error instanceof Error ? error.message : 'Consider using SSO.',
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScaffold
      title="Welcome to Campus Cats"
      subtitle="A field guide and volunteer hub for Georgia Tech's community cats."
    >
      <Button
        label="Sign in with Georgia Tech SSO"
        icon="school-outline"
        fullWidth
        disabled={busy}
        onPress={() => router.navigate('/saml-sign-in')}
      />
      <AppText variant="caption" color="muted" style={{ textAlign: 'center' }}>
        Or use an approved community account
      </AppText>
      <AuthTextField
        label="Email"
        value={formData.email}
        autoCapitalize="none"
        autoComplete="email"
        inputMode="email"
        keyboardType="email-address"
        onChangeText={(text) => handleChange('email', text)}
      />
      <AuthTextField
        label="Password"
        value={formData.password}
        autoCapitalize="none"
        autoComplete="current-password"
        secureTextEntry
        onChangeText={(text) => handleChange('password', text)}
      />
      <Button
        label="Forgot password?"
        icon="mail-outline"
        variant="tertiary"
        fullWidth
        disabled={busy}
        onPress={() => router.navigate('/forgot-password')}
      />
      {feedback ? (
        <FeedbackBanner message={feedback.message} tone={feedback.tone} />
      ) : null}
      <Button
        label="Sign in with email"
        variant="secondary"
        fullWidth
        loading={busy}
        loadingLabel="Signing in…"
        disabled={busy}
        onPress={() => void loginWhitelistUser()}
      />
      <Button
        label="Apply for community access"
        variant="tertiary"
        fullWidth
        disabled={busy}
        onPress={() => router.navigate('/whitelist')}
      />
    </AuthScaffold>
  );
};

export default LoginScreen;
