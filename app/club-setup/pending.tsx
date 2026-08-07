import { useState } from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { AuthScaffold } from '@/components/auth';
import { AppText, Button, FeedbackBanner, StatusPill } from '@/components/design';
import { useUniversitySelection } from '@/providers';

const ClubSetupPendingScreen = () => {
  const router = useRouter();
  const parameters = useLocalSearchParams<{
    maskedEmail?: string;
    expiresAt?: string;
  }>();
  const { university, refreshUniversity, clearUniversity } =
    useUniversitySelection();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  if (!university) return <Redirect href={'/university-search' as never} />;
  if (university.status === 'mapped') return <Redirect href="/login" />;

  const refresh = async () => {
    setBusy(true);
    setError(undefined);
    const refreshed = await refreshUniversity();
    setBusy(false);
    if (refreshed?.status === 'mapped') router.replace('/login');
    else if (!refreshed) setError('Could not refresh club setup status.');
  };

  const changeUniversity = async () => {
    await clearUniversity();
    router.replace('/university-search' as never);
  };

  return (
    <AuthScaffold
      title="President verification pending"
      subtitle={`${university.name} will be connected after the chosen President verifies their school email.`}
    >
      <StatusPill label="Waiting for verification" tone="warning" icon="time-outline" />
      {parameters.maskedEmail ? (
        <AppText>
          We sent a one-time verification link to {parameters.maskedEmail}.
        </AppText>
      ) : (
        <AppText>A verification request is already active for this university.</AppText>
      )}
      {parameters.expiresAt ? (
        <AppText color="muted" variant="caption">
          The link expires {new Date(parameters.expiresAt).toLocaleString()}.
        </AppText>
      ) : null}
      <AppText color="muted">
        After verification, the President receives a separate secure link to set a password.
      </AppText>
      {error ? <FeedbackBanner message={error} tone="danger" /> : null}
      <Button
        label="Refresh setup status"
        icon="refresh-outline"
        fullWidth
        loading={busy}
        disabled={busy}
        onPress={() => void refresh()}
      />
      <Button
        label="Change university"
        variant="tertiary"
        fullWidth
        disabled={busy}
        onPress={() => void changeUniversity()}
      />
    </AuthScaffold>
  );
};

export default ClubSetupPendingScreen;
