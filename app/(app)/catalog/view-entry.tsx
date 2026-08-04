import React, { useCallback, useState } from 'react';

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { AppHeader, Button, ErrorState, FeedbackBanner, Screen } from '@/components/design';
import { CatalogEntryElement } from '@/components/entries/CatalogEntryElement';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { appModules } from '@/composition/appModules';
import { canManageFeature, CatalogRecord, SightingRecord } from '@/core/domain';
import { DisplayMediaAsset } from '@/core/ports';
import { useAuth } from '@/providers';

const ViewEntry = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [entry, setEntry] = useState<CatalogRecord>();
  const [media, setMedia] = useState<readonly DisplayMediaAsset[]>([]);
  const [sightings, setSightings] = useState<readonly SightingRecord[]>([]);
  const [error, setError] = useState<string>();
  const [warning, setWarning] = useState<string>();
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(undefined);
      setWarning(undefined);
      if (!id) {
        setError('Missing catalog entry ID');
        setLoading(false);
        return () => { active = false; };
      }
      void Promise.all([
        appModules.catalog.get(id),
        appModules.catalog.media(id),
        appModules.sightings.list(),
      ]).then(([entryResult, mediaResult, sightingsResult]) => {
        if (!active) return;
        if (entryResult.ok) {
          setEntry(entryResult.value);
          if (sightingsResult.ok) {
            const loadedEntry = entryResult.value;
            setSightings(sightingsResult.value.filter((sighting) =>
              loadedEntry.source === 'inaturalist'
                ? sighting.source === 'inaturalist' &&
                  sighting.guideTaxonId === loadedEntry.sourceId
                : sighting.name === loadedEntry.cat.name,
            ));
          } else setWarning(sightingsResult.error.message);
        } else setError(entryResult.error.message);
        if (mediaResult.ok) setMedia(mediaResult.value);
        else setWarning(mediaResult.error.message);
        setLoading(false);
      });
      return () => { active = false; };
    }, [id]),
  );

  if (loading) return <LoadingIndicator label="Loading cat profile" />;

  return (
    <Screen
      scroll
      footer={entry && canManageFeature(user.role) ? (
        <Button
          label="Edit catalog entry"
          icon="create-outline"
          fullWidth
          onPress={() =>
            router.push({
              pathname: '/catalog/edit-entry',
              params: { id: entry.id },
            })
          }
        />
      ) : undefined}
    >
      <AppHeader title="Cat profile" eyebrow="Campus field guide" onBack={() => router.back()} />
      {warning ? <FeedbackBanner message={warning} tone="warning" /> : null}
      {entry ? (
        <CatalogEntryElement entry={entry} media={media} sightings={sightings} />
      ) : (
        <ErrorState title="Cat profile unavailable" message={error || 'Catalog entry not found'} />
      )}
    </Screen>
  );
};

export default ViewEntry;
