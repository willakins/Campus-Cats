import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import {
  AppHeader,
  Button,
  DetailSkeleton,
  ErrorState,
  FeedbackBanner,
  Screen,
} from '@/components/design';
import { CatalogEntryElement } from '@/components/entries/CatalogEntryElement';
import { appModules } from '@/composition/appModules';
import { canManageFeature, CatalogRecord, SightingRecord } from '@/core/domain';
import { DisplayMediaAsset } from '@/core/ports';
import {
  CatalogFavoriteSummary,
  moveCatalogFavorite,
  sightingsForCatalogEntry,
} from '@/features/catalog';
import { useAuth } from '@/providers';

export { sightingsForCatalogEntry } from '@/features/catalog';

const emptyFavorites: CatalogFavoriteSummary = { counts: {} };

const ViewEntry = () => {
  const { currentUser, user } = useAuth();
  const currentUserId = currentUser?.id;
  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [entry, setEntry] = useState<CatalogRecord>();
  const [media, setMedia] = useState<readonly DisplayMediaAsset[]>([]);
  const [sightings, setSightings] = useState<readonly SightingRecord[]>([]);
  const [favorites, setFavorites] = useState<CatalogFavoriteSummary>(emptyFavorites);
  const [error, setError] = useState<string>();
  const [warning, setWarning] = useState<string>();
  const [favoriteFeedback, setFavoriteFeedback] = useState<{
    readonly message: string;
    readonly tone: 'success' | 'warning' | 'danger';
  }>();
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(undefined);
      setWarning(undefined);
      setFavoriteFeedback(undefined);
      if (!id) {
        setError('Missing catalog entry ID');
        setLoading(false);
        return () => { active = false; };
      }
      const actor = currentUserRef.current;
      void Promise.all([
        appModules.catalog.get(actor, id),
        appModules.catalog.media(id),
        appModules.sightings.list(actor),
        actor
          ? appModules.catalog.favoriteSummary(actor)
          : Promise.resolve(undefined),
      ]).then(([entryResult, mediaResult, sightingsResult, favoritesResult]) => {
        if (!active) return;
        if (entryResult.ok) {
          setEntry(entryResult.value);
          if (sightingsResult.ok) {
            setSightings(
              sightingsForCatalogEntry(
                entryResult.value,
                sightingsResult.value,
              ),
            );
          } else setWarning(sightingsResult.error.message);
        } else setError(entryResult.error.message);
        if (mediaResult.ok) setMedia(mediaResult.value);
        else setWarning(mediaResult.error.message);
        if (favoritesResult?.ok) setFavorites(favoritesResult.value);
        else if (favoritesResult && !favoritesResult.ok) {
          setFavorites(emptyFavorites);
          setWarning(favoritesResult.error.message);
        }
        setLoading(false);
      });
      return () => { active = false; };
    }, [currentUserId, id]),
  );

  const toggleFavorite = useCallback(async () => {
    if (!entry) return;
    const actor = currentUserRef.current;
    if (!actor) {
      setFavoriteFeedback({
        message: 'Sign in to choose a favorite cat.',
        tone: 'warning',
      });
      return;
    }
    const nextCatalogId =
      favorites.selectedCatalogId === entry.id ? undefined : entry.id;
    setFavoriteBusy(true);
    setFavoriteFeedback(undefined);
    const result = await appModules.catalog.setFavorite(
      actor,
      nextCatalogId,
    );
    if (!result.ok) {
      setFavoriteFeedback({ message: result.error.message, tone: 'danger' });
      setFavoriteBusy(false);
      return;
    }
    setFavorites((current) => moveCatalogFavorite(current, nextCatalogId));
    setFavoriteFeedback({
      message: nextCatalogId
        ? `${entry.cat.name} is now your favorite cat.`
        : `${entry.cat.name} was removed as your favorite cat.`,
      tone: 'success',
    });
    setFavoriteBusy(false);
  }, [entry, favorites.selectedCatalogId]);

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
      {favoriteFeedback ? (
        <FeedbackBanner message={favoriteFeedback.message} tone={favoriteFeedback.tone} />
      ) : null}
      {loading ? (
        <DetailSkeleton label="Loading cat profile" />
      ) : entry ? (
        <CatalogEntryElement
          entry={entry}
          media={media}
          sightings={sightings}
          heartCount={favorites.counts[entry.id] ?? 0}
          isFavorite={favorites.selectedCatalogId === entry.id}
          favoriteBusy={favoriteBusy}
          onToggleFavorite={() => void toggleFavorite()}
        />
      ) : (
        <ErrorState title="Cat profile unavailable" message={error || 'Catalog entry not found'} />
      )}
    </Screen>
  );
};

export default ViewEntry;
