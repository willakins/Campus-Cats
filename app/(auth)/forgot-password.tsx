import React, { useState } from 'react';
import { useRouter } from 'expo-router';

import { AuthScaffold, AuthTextField } from '@/components/auth';
import { Button, FeedbackBanner } from '@/components/design';
import { useAuth } from '@/providers';

const ForgotPassword = () => {
  const router = useRouter();
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

  return (
    <AuthScaffold
      title="Reset your password"
      subtitle="Enter the email for your approved community account."
      onBack={() => router.back()}
    >
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
        <FeedbackBanner message={feedback.message} tone={feedback.tone} />
      ) : null}
      <Button
        label="Send reset link"
        icon="mail-outline"
        fullWidth
        loading={busy}
        loadingLabel="Sending reset link…"
        onPress={() => void sendPasswordReset()}
      />
    </AuthScaffold>
  );
};

export default ForgotPassword;
