import { CustomFieldDetails } from '@/presentation/customFields/CustomFields';
import React, { useCallback, useState } from 'react';

import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  DetailSkeleton,
  ErrorState,
  FeedbackBanner,
  FormActionBar,
} from '@/presentation/ui';
import { RestrictedScreen } from '@/presentation/access';
import { CommentsSection } from '@/presentation/comments';
import { useFocusTask } from '@/presentation/hooks/useFocusTask';
import { StationDetailsContent } from '@/presentation/screens/stations/components/StationDetailsContent';
import { appModules } from '@/composition/appModules';
import {
  canAccessRolePolicy,
  parseUser,
  PublicProfile,
  roleAccessPolicies,
  Station,
} from '@/core/domain';
import { StoredMediaAsset } from '@/core/ports';
import { useAuth } from '@/presentation/providers';

const ViewStation = () => {
  const { user } = useAuth();
  const actor = parseUser(user);
  const router = useRouter();
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

  const load = useCallback(async (isActive: () => boolean = () => true) => {
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
    if (!isActive()) return;
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

  useFocusTask(load);

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
      footerPresentation="floating"
      footer={station ? (
        <FormActionBar
          label="Mark station restocked"
          icon="checkmark-circle-outline"
          busy={busy}
          busyLabel="Restocking…"
          onPress={() => void restock()}
          secondaryAction={{
            label: 'Edit station',
            icon: 'create-outline',
            disabled: busy,
            onPress: () =>
              router.push({
                pathname: '/stations/[id]/edit',
                params: { id: station.id },
              }),
          }}
        />
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
          <StationDetailsContent
            station={station}
            status={appModules.stations.stockStatus(station)}
            media={media}
            contributorProfile={contributorProfile}
            onContributorPress={
              contributorId
                ? () => router.push({
                    pathname: '/profiles/[id]',
                    params: { id: contributorId },
                  })
                : undefined
            }
          />
          <CustomFieldDetails kind="station" id={station.id} />
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
