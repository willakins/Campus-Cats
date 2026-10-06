import { CustomFieldDetails } from '@/presentation/customFields/CustomFields';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import {
  AppHeader,
  DetailSkeleton,
  ErrorState,
  FeedbackBanner,
  FormActionBar,
  Screen,
} from '@/presentation/ui';
import { CommentsSection } from '@/presentation/comments';
import { CatalogDetailsContent } from '@/presentation/screens/catalog/components/CatalogDetailsContent';
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
import { useAuth } from '@/presentation/providers';

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
      footerPresentation="floating"
      footer={entry && canAccessRolePolicy(user.role, roleAccessPolicies.manageCatalog) ? (
        <FormActionBar
          label="Edit catalog entry"
          icon="create-outline"
          onPress={() =>
            router.push({
              pathname: '/catalog/[id]/edit',
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
          <CatalogDetailsContent
            entry={entry}
            media={media}
            sightings={sightings}
            heartCount={favorites.counts[entry.id] ?? 0}
            isFavorite={favorites.selectedCatalogId === entry.id}
            favoriteBusy={favoriteBusy}
            onToggleFavorite={() => void toggleFavorite()}
            onSightingPress={(sighting) =>
              router.push({
                pathname: '/map/sightings/[id]',
                params: { id: sighting.id },
              })
            }
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
          <CustomFieldDetails kind="catalog" id={entry.id} />
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
