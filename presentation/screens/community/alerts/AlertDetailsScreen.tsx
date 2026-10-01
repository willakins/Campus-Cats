import { useCallback, useState } from 'react';

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import {
  AppHeader,
  Button,
  DetailSkeleton,
  ErrorState,
  FeedbackBanner,
  Screen,
} from '@/presentation/ui';
import { AlertDetailsContent } from '@/presentation/screens/community/alerts/components/AlertDetailsContent';
import { appModules } from '@/composition/appModules';
import {
  Alert,
  canAccessRolePolicy,
  roleAccessPolicies,
} from '@/core/domain';
import { StoredMediaAsset } from '@/core/ports';
import { useAuth } from '@/presentation/providers';

const ViewAlert = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const isAdmin = canAccessRolePolicy(
    user.role,
    roleAccessPolicies.manageAlerts,
  );
  const [alert, setAlert] = useState<Alert>();
  const [media, setMedia] = useState<readonly StoredMediaAsset[]>([]);
  const [error, setError] = useState<string>();
  const [mediaError, setMediaError] = useState<string>();
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(undefined);
      setMediaError(undefined);
      if (!id) {
        setError('Missing alert ID');
        setLoading(false);
        return () => {
          active = false;
        };
      }
      void Promise.all([
        appModules.alerts.get(id),
        appModules.alerts.media(id),
      ]).then(([alertResult, mediaResult]) => {
        if (!active) return;
        if (alertResult.ok) {
          setAlert(alertResult.value);
          void appModules.alerts.markRead(user, id);
        } else setError(alertResult.error.message);
        if (mediaResult.ok) setMedia(mediaResult.value);
        else setMediaError(mediaResult.error.message);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [id, user.id]),
  );

  return (
    <Screen
      scroll
      footer={
        alert && isAdmin ? (
          <Button
            label="Edit alert"
            icon="create-outline"
            fullWidth
            onPress={() =>
              router.push({
                pathname: '/community/alerts/[id]/edit',
                params: { id: alert.id },
              })
            }
          />
        ) : undefined
      }
    >
      <AppHeader
        title="Alert"
        eyebrow="Campus Cats update"
        onBack={() => router.back()}
      />
      {mediaError ? (
        <FeedbackBanner message={mediaError} tone="warning" />
      ) : null}
      {loading ? (
        <DetailSkeleton label="Loading alert" />
      ) : alert ? (
        <AlertDetailsContent alert={alert} media={media} />
      ) : (
        <ErrorState
          title="Alert unavailable"
          message={error || 'Alert not found'}
        />
      )}
    </Screen>
  );
};

export default ViewAlert;
