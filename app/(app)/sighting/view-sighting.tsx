import React, { useCallback, useState } from 'react';

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { AppHeader, Button, ErrorState, FeedbackBanner, Screen } from '@/components/design';
import { SightingEntry } from '@/components/entries/SightingEntry';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { appModules } from '@/composition/appModules';
import { SightingRecord } from '@/core/domain';
import { DisplayMediaAsset } from '@/core/ports';
import { useAuth } from '@/providers';

const SightingScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const [sighting, setSighting] = useState<SightingRecord>();
  const [media, setMedia] = useState<readonly DisplayMediaAsset[]>([]);
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
        setError('Missing sighting ID');
        setLoading(false);
        return () => { active = false; };
      }
      void Promise.all([
        appModules.sightings.get(id),
        appModules.sightings.media(id),
      ]).then(([sightingResult, mediaResult]) => {
        if (!active) return;
        if (sightingResult.ok) setSighting(sightingResult.value);
        else setError(sightingResult.error.message);
        if (mediaResult.ok) setMedia(mediaResult.value);
        else setMediaError(mediaResult.error.message);
        setLoading(false);
      });
      return () => { active = false; };
    }, [id]),
  );

  if (loading) return <LoadingIndicator label="Loading sighting" />;

  return (
    <Screen
      scroll
      footer={sighting?.source === 'campus-cats' && user.id === sighting.createdBy.id ? (
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
      {sighting ? (
        <SightingEntry sighting={sighting} media={media} />
      ) : (
        <ErrorState title="Sighting unavailable" message={error || 'Sighting not found'} />
      )}
    </Screen>
  );
};

export default SightingScreen;
