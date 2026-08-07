import { useEffect, useRef, useState } from 'react';
import { Redirect, useRouter } from 'expo-router';

import { AuthScaffold } from '@/components/auth';
import { Button, FeedbackBanner } from '@/components/design';
import { appModules } from '@/composition/appModules';
import { useAuth, useUniversitySelection } from '@/providers';
import { registerForPushNotificationsAsync } from '@/utils/notifications';

const SamlSignIn = () => {
  const router = useRouter();
  const { samlSignIn } = useAuth();
  const { university } = useUniversitySelection();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: 'info' | 'danger' }>();

  const signIn = async () => {
    if (busy) return;
    try {
      setBusy(true);
      setFeedback(undefined);
      const result = await samlSignIn();
      if (result.status === 'cancelled') {
        setFeedback({ message: 'Sign-in was cancelled. You can try again.', tone: 'info' });
        return;
      }
      const token = await registerForPushNotificationsAsync();
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

  return (
    <AuthScaffold
      title="Georgia Tech SSO"
      subtitle="Sign in through Georgia Tech, then return here to continue."
      onBack={() => router.back()}
    >
      {feedback ? <FeedbackBanner message={feedback.message} tone={feedback.tone} /> : null}
      <Button
        label="Retry Georgia Tech SSO"
        icon="school-outline"
        fullWidth
        loading={busy}
        loadingLabel="Opening SSO…"
        onPress={() => void signIn()}
      />
    </AuthScaffold>
  );
};

export default SamlSignIn;
