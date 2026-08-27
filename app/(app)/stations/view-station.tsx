import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import {
  Button,
  DetailSkeleton,
  ErrorState,
  FeedbackBanner,
} from '@/components/design';
import { RestrictedScreen } from '@/components/access';
import { CommentsSection } from '@/components/comments';
import { StationEntry } from '@/components/entries/StationEntry';
import { appModules } from '@/composition/appModules';
import {
  canAccessRolePolicy,
  parseUser,
  PublicProfile,
  roleAccessPolicies,
  Station,
} from '@/core/domain';
import { StoredMediaAsset } from '@/core/ports';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

const ViewStation = () => {
  const { user } = useAuth();
  const actor = parseUser(user);
  const router = useRouter();
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [station, setStation] = useState<Station>();
  const [media, setMedia] = useState<readonly StoredMediaAsset[]>([]);
  const [contributorProfile, setContributorProfile] = useState<PublicProfile>();
  const [contributorId, setContributorId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [feedback, setFeedback] = useState<string>();
  const isAdmin = canAccessRolePolicy(
    user.role,
    roleAccessPolicies.manageStations,
  );

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setError(undefined);
    setFeedback(undefined);
    setContributorProfile(undefined);
    setContributorId(undefined);
    if (!id) {
      setError('Missing station ID');
      return;
    }
    const stationAttempt = appModules.stations.get(id);
    const [stationResult, mediaResult, contributorResult] = await Promise.all([
      stationAttempt,
      appModules.stations.media(id),
      stationAttempt.then(async (result) => {
        if (!result.ok) return undefined;
        return {
          id: result.value.createdBy.id,
          profile: await appModules.profiles.getOrSync(result.value.createdBy.id),
        };
      }),
    ]);
    if (stationResult.ok) setStation(stationResult.value);
    else setError(stationResult.error.message);
    if (mediaResult.ok) setMedia(mediaResult.value);
    else setFeedback(mediaResult.error.message);
    if (contributorResult) {
      setContributorId(contributorResult.id);
      if (contributorResult.profile.ok) {
        setContributorProfile(contributorResult.profile.value);
      }
    }
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
    const result = await appModules.stations.restock(actor, station.id);
    if (result.ok) {
      setStation(result.value);
      setFeedback('Station marked as restocked.');
    } else setFeedback(result.error.message);
    setBusy(false);
  };

  return (
    <RestrictedScreen
      title="Station details"
      eyebrow="Officer operations"
      onBack={() => router.back()}
      access={{ policy: roleAccessPolicies.manageStations, role: user.role }}
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
      {feedback ? (
        <FeedbackBanner
          message={feedback}
          tone={feedback === 'Station marked as restocked.' ? 'success' : 'danger'}
        />
      ) : null}
      {!station && !error ? (
        <DetailSkeleton label="Loading feeding station" />
      ) : station ? (
        <>
          <StationEntry
            station={station}
            status={appModules.stations.stockStatus(station)}
            media={media}
            contributorProfile={contributorProfile}
            onContributorPress={
              contributorId
                ? () => router.push({
                    pathname: '/profile/view-profile',
                    params: { id: contributorId },
                  })
                : undefined
            }
          />
          <CommentsSection
            actor={actor}
            target={{ kind: 'station', id: station.id }}
          />
        </>
      ) : (
        <ErrorState title="Station unavailable" message={error || 'Feeding station not found'} onRetry={() => void load()} />
      )}
    </RestrictedScreen>
  );
};

export default ViewStation;
