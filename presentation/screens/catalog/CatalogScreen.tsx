import { cardListViewportStyle, cardListContentStyle } from '@/theme';
import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FlatList, useWindowDimensions, View } from 'react-native';

import { useRouter } from 'expo-router';

import {
  AppHeader,
  CardListSkeleton,
  EmptyState,
  ErrorState,
  FailureToast,
  FeedbackBanner,
  FloatingActionButton,
  Screen,
  SuccessToast,
} from '@/presentation/ui';
import {
  catalogCardWidth,
  catalogColumnCount,
} from '@/presentation/patterns/catalog/catalogLayout';
import { CatalogToolbar } from '@/presentation/screens/catalog/components/CatalogToolbar';
import { virtualizedListPerformanceProps } from '@/presentation/patterns/lists/virtualizedListPerformance';
import { CatalogListItem } from '@/presentation/patterns/catalog/CatalogListItem';
import { useFocusTask } from '@/presentation/hooks/useFocusTask';
import { useFloatingTabBarContentInset } from '@/presentation/navigation/floatingTabBar';
import { appModules } from '@/composition/appModules';
import {
  canAccessRolePolicy,
  CatalogRecord,
  CatalogTag,
  CatalogTagAssignment,
  SightingRecord,
  roleAccessPolicies,
} from '@/core/domain';
import {
  buildCatalogItems,
  CatalogFavoriteSummary,
  CatalogSort,
  filterAndSortCatalog,
  moveCatalogFavorite,
} from '@/features/catalog';
import { useAuth } from '@/presentation/providers';
import { useAppTheme } from '@/theme';

const emptyFavorites: CatalogFavoriteSummary = { counts: {} };

const Catalog = () => {
  const { currentUser, user } = useAuth();
  const currentUserId = currentUser?.id;
  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  const router = useRouter();
  const theme = useAppTheme();
  const floatingTabBarContentInset = useFloatingTabBarContentInset();
  const { width, fontScale } = useWindowDimensions();
  const isAdmin = canAccessRolePolicy(
    user.role,
    roleAccessPolicies.manageCatalog,
  );
  const columns = catalogColumnCount(width, fontScale);
  const cardWidth = catalogCardWidth(
    width,
    columns,
    theme.layout.screenGutter,
    theme.layout.maxContentWidth,
    theme.spacing.md,
  );
  const [entries, setEntries] = useState<readonly CatalogRecord[]>([]);
  const [sightings, setSightings] = useState<readonly SightingRecord[]>([]);
  const [favorites, setFavorites] = useState<CatalogFavoriteSummary>(emptyFavorites);
  const [tags, setTags] = useState<readonly CatalogTag[]>([]);
  const [tagAssignments, setTagAssignments] = useState<
    readonly CatalogTagAssignment[]
  >([]);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [sort, setSort] = useState<CatalogSort>('name-asc');
  const [selectedTagIds, setSelectedTagIds] = useState<readonly string[]>([]);
  const [favoriteBusyId, setFavoriteBusyId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [feedback, setFeedback] = useState<{
    readonly message: string;
    readonly tone: 'info' | 'warning' | 'danger' | 'success';
  }>();
  const [toast, setToast] = useState<{
    readonly message: string;
    readonly tone: 'danger' | 'success';
  }>();

  const load = useCallback(async (isActive: () => boolean = () => true) => {
    setLoading(true);
    setError(undefined);
    setFeedback(undefined);
    setToast(undefined);
    const actor = currentUserRef.current;
    const [
      catalogResult,
      sightingsResult,
      favoritesResult,
      tagsResult,
      assignmentsResult,
    ] = await Promise.all([
      appModules.catalog.list(actor),
      appModules.sightings.list(actor),
      actor
        ? appModules.catalog.favoriteSummary(actor)
        : Promise.resolve(undefined),
      actor ? appModules.catalogTags.list(actor) : Promise.resolve(undefined),
      actor
        ? appModules.catalogTags.assignments(actor)
        : Promise.resolve(undefined),
    ]);
    if (!isActive()) return;
    const warnings: string[] = [];
    if (catalogResult.ok) {
      setEntries(catalogResult.value);
      warnings.push(...catalogResult.warnings.map(({ message }) => message));
    } else setError(catalogResult.error.message);
    if (sightingsResult.ok) setSightings(sightingsResult.value);
    else {
      setSightings([]);
      warnings.push(sightingsResult.error.message);
    }
    if (favoritesResult?.ok) {
      setFavorites(favoritesResult.value);
      warnings.push(...favoritesResult.warnings.map(({ message }) => message));
    } else if (favoritesResult && !favoritesResult.ok) {
      setFavorites(emptyFavorites);
      warnings.push(favoritesResult.error.message);
    } else setFavorites(emptyFavorites);
    if (tagsResult?.ok) {
      const configuredIds = new Set<string>(
        tagsResult.value.map(({ id }) => id),
      );
      setTags(tagsResult.value);
      setSelectedTagIds((current) =>
        current.filter((tagId) => configuredIds.has(tagId)),
      );
    } else {
      setTags([]);
      if (tagsResult && !tagsResult.ok) warnings.push(tagsResult.error.message);
    }
    if (assignmentsResult?.ok) setTagAssignments(assignmentsResult.value);
    else {
      setTagAssignments([]);
      if (assignmentsResult && !assignmentsResult.ok) {
        warnings.push(assignmentsResult.error.message);
      }
    }
    if (warnings.length > 0) {
      setFeedback({ message: warnings.join(' '), tone: 'warning' });
    }
    setLoading(false);
  }, [currentUserId]);

  useFocusTask(load);

  const catalogItems = useMemo(
    () => buildCatalogItems(entries, sightings, favorites, tags, tagAssignments),
    [entries, favorites, sightings, tagAssignments, tags],
  );
  const visibleItems = useMemo(
    () => filterAndSortCatalog(catalogItems, deferredQuery, sort, selectedTagIds),
    [catalogItems, deferredQuery, selectedTagIds, sort],
  );

  const toggleFavorite = useCallback(
    async (entry: CatalogRecord) => {
      const actor = currentUserRef.current;
      if (!actor) {
        setToast({
          message: 'Sign in to choose a favorite cat.',
          tone: 'danger',
        });
        return;
      }
      const nextCatalogId =
        favorites.selectedCatalogId === entry.id ? undefined : entry.id;
      setFavoriteBusyId(entry.id);
      setToast(undefined);
      const result = await appModules.catalog.setFavorite(
        actor,
        nextCatalogId,
      );
      if (!result.ok) {
        setToast({ message: result.error.message, tone: 'danger' });
        setFavoriteBusyId(undefined);
        return;
      }

      setFavorites((current) => moveCatalogFavorite(current, nextCatalogId));
      setToast({
        message: nextCatalogId
          ? `${entry.cat.name} is now your favorite cat.`
          : `${entry.cat.name} was removed as your favorite cat.`,
        tone: 'success',
      });
      setFavoriteBusyId(undefined);
    },
    [favorites.selectedCatalogId],
  );

  return (
    <>
      <Screen
        floatingAction={isAdmin ? (
          <FloatingActionButton
            accessibilityLabel="Create catalog entry"
            accessibilityHint="Opens the new catalog entry form"
            onPress={() => router.push('/catalog/new')}
          />
        ) : undefined}
      >
        <AppHeader title="Cat-alog" eyebrow="Meet the colony" />
        <View style={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.md }}>
          <CatalogToolbar
            query={query}
            sort={sort}
            availableTags={tags}
            selectedTagIds={selectedTagIds}
            resultCount={loading ? undefined : visibleItems.length}
            onQueryChange={setQuery}
            onSortChange={setSort}
            onSelectedTagIdsChange={setSelectedTagIds}
          />
          {feedback ? (
            <FeedbackBanner message={feedback.message} tone={feedback.tone} />
          ) : null}
        </View>
        {loading ? (
          <CardListSkeleton
            label="Loading cat cards"
            count={columns * 2}
            columns={columns}
            layout="cover"
          />
        ) : (
          <FlatList
            {...virtualizedListPerformanceProps}
            key={`catalog-${columns}`}
            style={cardListViewportStyle(theme)}
            removeClippedSubviews={false}
            data={error ? [] : visibleItems}
            numColumns={columns}
            keyExtractor={({ entry }) => entry.id}
            contentContainerStyle={{
              ...cardListContentStyle(theme),
              flexGrow: 1,
              gap: theme.spacing.md,
              paddingBottom: Math.max(
                isAdmin ? theme.spacing.huge * 2 : theme.spacing.md,
                floatingTabBarContentInset + theme.spacing.md,
              ),
            }}
            columnWrapperStyle={
              columns > 1 ? { gap: theme.spacing.md } : undefined
            }
            renderItem={({ item }) => (
              <View style={{ width: cardWidth, minWidth: 0 }}>
                <CatalogListItem
                  {...item.entry}
                  sightingCount={item.sightingCount}
                  heartCount={item.heartCount}
                  firstSighting={item.firstSighting}
                  isFavorite={item.isFavorite}
                  tags={item.tags}
                  favoriteBusy={favoriteBusyId !== undefined}
                  onToggleFavorite={() => void toggleFavorite(item.entry)}
                />
              </View>
            )}
            ListEmptyComponent={
              error ? (
                <ErrorState
                  title="Catalog unavailable"
                  message={error}
                  onRetry={() => void load()}
                />
              ) : (query.trim() || selectedTagIds.length > 0) &&
                entries.length > 0 ? (
                <EmptyState
                  title="No matching cats"
                  message="No profiles match the current search and filters. Try broadening your choices."
                  actionLabel="Clear filters"
                  onAction={() => {
                    setQuery('');
                    setSelectedTagIds([]);
                  }}
                />
              ) : (
                <EmptyState
                  title="No cats yet"
                  message="Catalog profiles will appear here when officers add them."
                />
              )
            }
          />
        )}
      </Screen>
      {toast?.tone === 'success' ? (
        <SuccessToast
          message={toast.message}
          onDismiss={() => setToast(undefined)}
        />
      ) : toast ? (
        <FailureToast
          message={toast.message}
          onDismiss={() => setToast(undefined)}
        />
      ) : null}
    </>
  );
};

export default Catalog;
