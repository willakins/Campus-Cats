import React, { useCallback, useState } from 'react';

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import {
  AppHeader,
  Button,
  DetailSkeleton,
  ErrorState,
  FeedbackBanner,
  Screen,
} from '@/components/design';
import { SightingEntry } from '@/components/entries/SightingEntry';
import { appModules } from '@/composition/appModules';
import {
  PublicProfile,
  SightingRecord,
  canViewContributors,
  parseUser,
} from '@/core/domain';
import { DisplayMediaAsset } from '@/core/ports';
import { useAppSettings, useAuth } from '@/providers';

const SightingScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const actor = parseUser(user);
  const { settings } = useAppSettings();
  const mayViewContributor = canViewContributors(
    actor.role,
    settings.sightingsAnonymous,
  );
  const [sighting, setSighting] = useState<SightingRecord>();
  const [media, setMedia] = useState<readonly DisplayMediaAsset[]>([]);
  const [reporterProfile, setReporterProfile] = useState<PublicProfile>();
  const [error, setError] = useState<string>();
  const [mediaError, setMediaError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const reporterId = mayViewContributor && sighting?.source === 'campus-cats'
    ? sighting.createdBy?.id
    : undefined;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setSighting(undefined);
      setMedia([]);
      setError(undefined);
      setMediaError(undefined);
      setReporterProfile(undefined);
      if (!id) {
        setError('Missing sighting ID');
        setLoading(false);
        return () => { active = false; };
      }
      const sightingAttempt = appModules.sightings.get(actor, id);
      void Promise.all([
        sightingAttempt,
        appModules.sightings.media(id),
        sightingAttempt.then((result) =>
          mayViewContributor
            && result.ok
            && result.value.source === 'campus-cats'
            && result.value.createdBy
            ? appModules.profiles.getOrSync(result.value.createdBy.id)
            : undefined,
        ),
      ]).then(([sightingResult, mediaResult, profileResult]) => {
        if (!active) return;
        if (sightingResult.ok) setSighting(sightingResult.value);
        else setError(sightingResult.error.message);
        if (mediaResult.ok) setMedia(mediaResult.value);
        else setMediaError(mediaResult.error.message);
        if (profileResult?.ok) setReporterProfile(profileResult.value);
        setLoading(false);
      });
      return () => { active = false; };
    }, [actor.id, actor.role, id, mayViewContributor]),
  );

  return (
    <Screen
      scroll
      footer={sighting?.source === 'campus-cats' && sighting.createdBy && user.id === sighting.createdBy.id ? (
        <Button
          label="Edit sighting"
          icon="create-outline"
          fullWidth
          onPress={() =>
            router.push({
              pathname: '/sighting/edit-sighting',
              params: { id: sighting.id },
            })
          }
        />
      ) : undefined}
    >
      <AppHeader
        title="Sighting details"
        eyebrow="Field report"
        onBack={() => router.push('/(app)/(tabs)')}
      />
      {mediaError ? <FeedbackBanner message={mediaError} tone="warning" /> : null}
      {loading ? (
        <DetailSkeleton label="Loading sighting" />
      ) : sighting ? (
        <SightingEntry
          sighting={sighting}
          media={media}
          reporterProfile={reporterProfile}
          showContributor={mayViewContributor}
          onReporterPress={
            reporterId
              ? () =>
                  router.push({
                    pathname: '/profile/view-profile',
                    params: { id: reporterId },
                  })
              : undefined
          }
        />
      ) : (
        <ErrorState title="Sighting unavailable" message={error || 'Sighting not found'} />
      )}
    </Screen>
  );
};

export default SightingScreen;
