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
import { CommentsSection } from '@/components/comments';
import { CatalogEntryElement } from '@/components/entries/CatalogEntryElement';
import { appModules } from '@/composition/appModules';
import {
  canAccessRolePolicy,
  CatalogRecord,
  parseUser,
  PublicProfile,
  roleAccessPolicies,
  SightingRecord,
} from '@/core/domain';
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
  const actor = parseUser(user);
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
  const [contributorProfile, setContributorProfile] = useState<PublicProfile>();
  const [contributorId, setContributorId] = useState<string>();
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
      setContributorProfile(undefined);
      setContributorId(undefined);
      if (!id) {
        setError('Missing catalog entry ID');
        setLoading(false);
        return () => { active = false; };
      }
      const actor = currentUserRef.current;
      const entryAttempt = appModules.catalog.get(actor, id);
      void Promise.all([
        entryAttempt,
        appModules.catalog.media(id),
        appModules.sightings.list(actor),
        actor
          ? appModules.catalog.favoriteSummary(actor)
          : Promise.resolve(undefined),
        entryAttempt.then(async (result) => {
          if (!result.ok) return undefined;
          const contributor = result.value.source === 'inaturalist'
            ? result.value.localContribution?.createdBy
            : result.value.createdBy;
          if (!contributor) return undefined;
          return {
            id: contributor.id,
            profile: await appModules.profiles.getOrSync(contributor.id),
          };
        }),
      ]).then(([
        entryResult,
        mediaResult,
        sightingsResult,
        favoritesResult,
        contributorResult,
      ]) => {
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
        if (contributorResult) {
          setContributorId(contributorResult.id);
          if (contributorResult.profile.ok) {
            setContributorProfile(contributorResult.profile.value);
          }
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
      footer={entry && canAccessRolePolicy(user.role, roleAccessPolicies.manageCatalog) ? (
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
        <>
          <CatalogEntryElement
            entry={entry}
            media={media}
            sightings={sightings}
            heartCount={favorites.counts[entry.id] ?? 0}
            isFavorite={favorites.selectedCatalogId === entry.id}
            favoriteBusy={favoriteBusy}
            onToggleFavorite={() => void toggleFavorite()}
            onSightingPress={(sighting) =>
              router.push({
                pathname: '/sighting/view-sighting',
                params: { id: sighting.id },
              })
            }
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
            target={{ kind: 'catalog', id: entry.id }}
          />
        </>
      ) : (
        <ErrorState title="Cat profile unavailable" message={error || 'Catalog entry not found'} />
      )}
    </Screen>
  );
};

export default ViewEntry;
