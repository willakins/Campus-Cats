import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import {
  AccessDeniedState,
  AppHeader,
  Button,
  DetailSkeleton,
  ErrorState,
  FeedbackBanner,
  Screen,
} from '@/components/design';
import { StationEntry } from '@/components/entries/StationEntry';
import { appModules } from '@/composition/appModules';
import { canManageFeature, parseUser, Station } from '@/core/domain';
import { StoredMediaAsset } from '@/core/ports';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

const ViewStation = () => {
  const { user } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [station, setStation] = useState<Station>();
  const [media, setMedia] = useState<readonly StoredMediaAsset[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [feedback, setFeedback] = useState<string>();
  const isAdmin = canManageFeature(user.role);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setError(undefined);
    setFeedback(undefined);
    if (!id) {
      setError('Missing station ID');
      return;
    }
    const [stationResult, mediaResult] = await Promise.all([
      appModules.stations.get(id),
      appModules.stations.media(id),
    ]);
    if (stationResult.ok) setStation(stationResult.value);
    else setError(stationResult.error.message);
    if (mediaResult.ok) setMedia(mediaResult.value);
    else setFeedback(mediaResult.error.message);
  }, [id, isAdmin]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const restock = async () => {
    if (!station || busy) return;
    setBusy(true);
    setFeedback(undefined);
    const result = await appModules.stations.restock(parseUser(user), station.id);
    if (result.ok) {
      setStation(result.value);
      setFeedback('Station marked as restocked.');
    } else setFeedback(result.error.message);
    setBusy(false);
  };

  if (!isAdmin) {
    return (
      <Screen>
        <AppHeader title="Station details" eyebrow="Officer operations" onBack={() => router.back()} />
        <AccessDeniedState message="Officer access is required to view feeding-station operations." />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      footer={station ? (
        <View style={{ gap: theme.spacing.xs }}>
          <Button
            label="Mark station restocked"
            icon="checkmark-circle-outline"
            fullWidth
            loading={busy}
            loadingLabel="Restocking…"
            onPress={() => void restock()}
          />
          <Button
            label="Edit station"
            icon="create-outline"
            variant="secondary"
            fullWidth
            disabled={busy}
            onPress={() =>
              router.push({
                pathname: '/stations/edit-station',
                params: { id: station.id },
              })
            }
          />
        </View>
      ) : undefined}
    >
      <AppHeader title="Station details" eyebrow="Officer operations" onBack={() => router.back()} />
      {feedback ? (
        <FeedbackBanner
          message={feedback}
          tone={feedback === 'Station marked as restocked.' ? 'success' : 'danger'}
        />
      ) : null}
      {!station && !error ? (
        <DetailSkeleton label="Loading feeding station" />
      ) : station ? (
        <StationEntry
          station={station}
          status={appModules.stations.stockStatus(station)}
          media={media}
        />
      ) : (
        <ErrorState title="Station unavailable" message={error || 'Feeding station not found'} onRetry={() => void load()} />
      )}
    </Screen>
  );
};

export default ViewStation;
