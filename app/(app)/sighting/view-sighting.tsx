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
import { CommentsSection } from '@/components/comments';
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
  const [reporterId, setReporterId] = useState<string>();
  const [error, setError] = useState<string>();
  const [mediaError, setMediaError] = useState<string>();
  const [loading, setLoading] = useState(true);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setSighting(undefined);
      setMedia([]);
      setError(undefined);
      setMediaError(undefined);
      setReporterProfile(undefined);
      setReporterId(undefined);
      if (!id) {
        setError('Missing sighting ID');
        setLoading(false);
        return () => { active = false; };
      }
      const sightingAttempt = appModules.sightings.get(actor, id);
      void Promise.all([
        sightingAttempt,
        appModules.sightings.media(id),
        sightingAttempt.then(async (result) => {
          if (!result.ok) return undefined;
          let reporterUserId: string | undefined;
          if (result.value.source === 'campus-cats') {
            reporterUserId = mayViewContributor
              ? result.value.createdBy?.id
              : undefined;
          } else {
            const linked = await appModules.sightings.linkedReporter(
              actor,
              result.value.observer.id,
            );
            reporterUserId = linked.ok ? linked.value : undefined;
          }
          if (!reporterUserId) return undefined;
          return {
            reporterUserId,
            profile: await appModules.profiles.getOrSync(reporterUserId),
          };
        }),
      ]).then(([sightingResult, mediaResult, reporterResult]) => {
        if (!active) return;
        if (sightingResult.ok) setSighting(sightingResult.value);
        else setError(sightingResult.error.message);
        if (mediaResult.ok) setMedia(mediaResult.value);
        else setMediaError(mediaResult.error.message);
        if (reporterResult) {
          setReporterId(reporterResult.reporterUserId);
          if (reporterResult.profile.ok) {
            setReporterProfile(reporterResult.profile.value);
          }
        }
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
        onBack={() => router.back()}
      />
      {mediaError ? <FeedbackBanner message={mediaError} tone="warning" /> : null}
      {loading ? (
        <DetailSkeleton label="Loading sighting" />
      ) : sighting ? (
        <>
          <SightingEntry
            sighting={sighting}
            media={media}
            reporterProfile={reporterProfile}
            showContributor={mayViewContributor || Boolean(reporterId)}
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
          <CommentsSection
            actor={actor}
            target={{ kind: 'sighting', id: sighting.id }}
          />
        </>
      ) : (
        <ErrorState title="Sighting unavailable" message={error || 'Sighting not found'} />
      )}
    </Screen>
  );
};

export default SightingScreen;
