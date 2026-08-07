import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AuthScaffold } from '@/components/auth';
import { Button, FeedbackBanner, StatusPill } from '@/components/design';
import { useUniversitySelection } from '@/providers';

const ClubSetupVerificationScreen = () => {
  const router = useRouter();
  const parameters = useLocalSearchParams<{
    requestId?: string;
    token?: string;
  }>();
  const { verifySetup } = useUniversitySelection();
  const [state, setState] = useState<'verifying' | 'verified' | 'error'>(
    'verifying',
  );
  const [message, setMessage] = useState('Creating your club securely…');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void verifySetup(parameters.requestId ?? '', parameters.token ?? '').then(
      (result) => {
        if (!result.ok) {
          setState('error');
          setMessage(result.error.message);
          return;
        }
        setState('verified');
        setMessage(
          `Your club is ready. Password-setup instructions were sent to the President.`,
        );
      },
    );
  }, [parameters.requestId, parameters.token, verifySetup]);

  return (
    <AuthScaffold
      title="Verify club setup"
      subtitle="Confirm the President before Campus Cats creates the university club."
    >
      {state === 'verifying' ? (
        <StatusPill label="Verifying President" tone="info" loading />
      ) : (
        <FeedbackBanner
          message={message}
          tone={state === 'verified' ? 'success' : 'danger'}
        />
      )}
      {state === 'verified' ? (
        <Button
          label="Continue to club login"
          icon="log-in-outline"
          fullWidth
          onPress={() => router.replace('/login')}
        />
      ) : null}
      {state === 'error' ? (
        <Button
          label="Choose a university"
          variant="secondary"
          fullWidth
          onPress={() => router.replace('/university-search' as never)}
        />
      ) : null}
    </AuthScaffold>
  );
};

export default ClubSetupVerificationScreen;
