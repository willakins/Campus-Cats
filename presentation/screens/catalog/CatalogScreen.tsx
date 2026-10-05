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

import { useFocusEffect, useRouter } from 'expo-router';

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
  roleAccessPolicies,
} from '@/core/domain';
import { CatalogSort, filterAndSortCatalog } from '@/features/catalog';
import { useAuth } from '@/presentation/providers';
import { useAppTheme } from '@/theme';

import type {
  CatalogDiscoveryCard,
  CatalogDiscoveryCursor,
} from '@/core/ports';

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
  const [cards, setCards] = useState<readonly CatalogDiscoveryCard[]>([]);
  const [tags, setTags] = useState<readonly CatalogTag[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<CatalogDiscoveryCursor>();
  const [loadingMore, setLoadingMore] = useState(false);
  const generation = useRef(0);
  const moreRequest = useRef(false);
  const paged = appModules.catalog.usesPagedDiscovery;
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

  const selectedTagsKey = JSON.stringify([...selectedTagIds].sort());
  const serverQuery = paged ? deferredQuery : '';
  const serverSort = paged ? sort : 'name-asc';
  const serverTagsKey = paged ? selectedTagsKey : '[]';
  const load = useCallback(
    async (isActive: () => boolean = () => true) => {
      const version = ++generation.current;
      moreRequest.current = false;
      setLoadingMore(false);
      setNextCursor(undefined);
      setLoading(true);
      setError(undefined);
      setFeedback(undefined);
      const result = await appModules.catalog.discover(currentUserRef.current, {
        search: serverQuery,
        sort: serverSort,
        tagIds: JSON.parse(serverTagsKey) as string[],
        pageSize: 40,
      });
      if (!isActive() || version !== generation.current) return;
      if (result.ok) {
        setCards(result.value.items);
        setTags(result.value.availableTags);
        setTotal(result.value.total);
        setNextCursor(result.value.nextCursor);
        const configuredIds = new Set<string>(
          result.value.availableTags.map(({ id }) => id),
        );
        setSelectedTagIds((current) =>
          current.every((id) => configuredIds.has(id))
            ? current
            : current.filter((id) => configuredIds.has(id)),
        );
        if (result.warnings.length)
          setFeedback({
            message: result.warnings.map(({ message }) => message).join(' '),
            tone: 'warning',
          });
      } else {
        setError(result.error.message);
        setCards([]);
        setTotal(0);
      }
      setLoading(false);
    },
    [currentUserId, serverQuery, serverSort, serverTagsKey],
  );

  useFocusTask(load);
  // Discard outstanding page requests after blur/unmount or a new focused query.
  useFocusEffect(
    useCallback(
      () => () => {
        generation.current++;
      },
      [],
    ),
  );
  const visibleItems = useMemo(
    () =>
      paged
        ? cards
        : filterAndSortCatalog(cards, deferredQuery, sort, selectedTagIds),
    [cards, deferredQuery, paged, sort, selectedTagIds],
  );

  const loadMore = useCallback(async () => {
    if (!paged || loading || !nextCursor || moreRequest.current) return;
    moreRequest.current = true;
    setLoadingMore(true);
    const version = generation.current;
    const result = await appModules.catalog.discover(currentUserRef.current, {
      search: serverQuery,
      sort: serverSort,
      tagIds: JSON.parse(serverTagsKey) as string[],
      pageSize: 40,
      cursor: nextCursor,
    });
    if (version !== generation.current) return;
    if (result.ok) {
      setCards((current) => {
        const existing = new Set(current.map(({ entry }) => entry.id));
        return [
          ...current,
          ...result.value.items.filter(({ entry }) => !existing.has(entry.id)),
        ];
      });
      setNextCursor(result.value.nextCursor);
      setTotal(result.value.total);
    } else setFeedback({ message: result.error.message, tone: 'warning' });
    moreRequest.current = false;
    setLoadingMore(false);
  }, [loading, nextCursor, paged, serverQuery, serverSort, serverTagsKey]);

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
      const nextCatalogId = cards.some(
        (card) => card.entry.id === entry.id && card.isFavorite,
      )
        ? undefined
        : entry.id;
      setFavoriteBusyId(entry.id);
      setToast(undefined);
      const result = await appModules.catalog.setFavorite(actor, nextCatalogId);
      if (!result.ok) {
        setToast({ message: result.error.message, tone: 'danger' });
        setFavoriteBusyId(undefined);
        return;
      }

      if (paged) {
        // Sorting by hearts can change page boundaries; refresh after an accepted mutation.
        await load();
      } else
        setCards((current) =>
          current.map((card) => ({
            ...card,
            isFavorite: card.entry.id === nextCatalogId,
            heartCount: Math.max(
              0,
              card.heartCount -
                (card.isFavorite ? 1 : 0) +
                (card.entry.id === nextCatalogId ? 1 : 0),
            ),
          })),
        );

      setToast({
        message: nextCatalogId
          ? `${entry.cat.name} is now your favorite cat.`
          : `${entry.cat.name} was removed as your favorite cat.`,
        tone: 'success',
      });
      setFavoriteBusyId(undefined);
    },
    [cards, load, paged],
  );

  return (
    <>
      <Screen
        floatingAction={
          isAdmin ? (
            <FloatingActionButton
              accessibilityLabel="Create catalog entry"
              accessibilityHint="Opens the new catalog entry form"
              onPress={() => router.push('/catalog/new')}
            />
          ) : undefined
        }
      >
        <AppHeader title="Cat-alog" eyebrow="Meet the colony" />
        <View
          style={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.md }}
        >
          <CatalogToolbar
            query={query}
            sort={sort}
            availableTags={tags}
            selectedTagIds={selectedTagIds}
            resultCount={
              loading ? undefined : paged ? total : visibleItems.length
            }
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
            onEndReached={() => void loadMore()}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <CardListSkeleton
                  label="Loading more cats"
                  count={columns}
                  columns={columns}
                  layout="cover"
                />
              ) : undefined
            }
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
                  cover={item.cover}
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
                (paged || cards.length > 0) ? (
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
