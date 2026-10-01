import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';

import {
  AppText,
  Card,
  FeedbackBanner,
  Screen,
  SearchField,
  StatusPill,
} from '@/presentation/ui';
import { appModules } from '@/composition/appModules';
import { UniversitySearchResult } from '@/core/domain';
import { useUniversitySelection } from '@/presentation/providers';
import { useAppTheme } from '@/theme';

const UniversitySearchScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const {
    selectUniversity,
    universitySearch,
    rememberUniversitySearch,
  } = useUniversitySelection();
  const scrollRef = useRef<ScrollView>(null);
  const searchCardOffset = useRef(0);
  const [query, setQuery] = useState(universitySearch.query);
  const [results, setResults] = useState<readonly UniversitySearchResult[]>(
    universitySearch.results,
  );
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    const normalized = query.trim();
    if (normalized.length < 2) {
      setResults([]);
      rememberUniversitySearch(query, []);
      setSearching(false);
      setError(undefined);
      return undefined;
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      void appModules.universityOnboarding.search(normalized).then((result) => {
        if (cancelled) return;
        setSearching(false);
        if (result.ok) {
          setResults(result.value);
          rememberUniversitySearch(query, result.value);
          setError(undefined);
        } else setError(result.error.message);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, rememberUniversitySearch]);

  const updateQuery = (nextQuery: string) => {
    setQuery(nextQuery);
    setResults([]);
    rememberUniversitySearch(nextQuery, []);
  };

  const choose = async (university: UniversitySearchResult) => {
    const selected = await selectUniversity(university);
    if (!selected.ok) {
      setError(selected.error.message);
      return;
    }
    router.push(
      university.status === 'mapped'
        ? '/login'
        : university.status === 'pending'
          ? ('/club-setup/pending' as never)
          : ('/club-setup' as never),
    );
  };

  const normalizedQuery = query.trim();
  const showSearchPrompt = normalizedQuery.length < 2;
  const showEmptyResults =
    !searching && normalizedQuery.length >= 2 && !results.length && !error;
  const scrollSearchToTop = useCallback(() => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, searchCardOffset.current - theme.spacing.sm),
      animated: true,
    });
  }, [theme.spacing.sm]);

  return (
    <>
      {Platform.OS === 'web' ? (
        <Head>
          <title>Select your university | Campus Cats</title>
        </Head>
      ) : null}
      <Screen
        scroll
        keyboardAware
        scrollRef={scrollRef}
        onContentSizeChange={() => {
          if (normalizedQuery.length >= 2) scrollSearchToTop();
        }}
        contentStyle={{ paddingBottom: theme.spacing.huge }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: theme.layout.maxAuthWidth,
            alignSelf: 'center',
            gap: theme.spacing.lg,
            paddingTop: theme.spacing.xl,
          }}
        >
          <View
            style={{
              overflow: 'hidden',
              gap: theme.spacing.lg,
              padding: theme.spacing.xl,
              borderRadius: theme.radii.sheet,
              backgroundColor: theme.colors.primarySurface,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: theme.spacing.md,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: theme.radii.pill,
                  backgroundColor: theme.colors.primary,
                }}
              >
                <Ionicons
                  name="school-outline"
                  size={26}
                  color={theme.colors.onPrimary}
                />
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.xs,
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: theme.spacing.xxs,
                  borderRadius: theme.radii.pill,
                  backgroundColor: theme.colors.primary,
                }}
              >
                <Ionicons name="paw" size={14} color={theme.colors.onPrimary} />
                <AppText
                  variant="caption"
                  style={{ color: theme.colors.onPrimary, letterSpacing: 0.6 }}
                >
                  CAMPUS CATS
                </AppText>
              </View>
            </View>
            <View style={{ gap: theme.spacing.xs }}>
              <AppText accessibilityRole="header" variant="display">
                Select your university
              </AppText>
              <AppText color="muted">
                Find your campus community or get a new Campus Cats club
                started.
              </AppText>
            </View>
          </View>

          <View
            onLayout={({ nativeEvent }) => {
              searchCardOffset.current = nativeEvent.layout.y;
            }}
          >
            <Card accent={theme.colors.gold} style={{ gap: theme.spacing.md }}>
              <View style={{ gap: theme.spacing.xxs }}>
                <AppText variant="cardTitle">Find your campus</AppText>
                <AppText color="muted">
                  Search verified U.S. colleges and universities.
                </AppText>
              </View>
              <SearchField
                accessibilityLabel="University"
                value={query}
                placeholder="Try “Emory University”"
                clearAccessibilityLabel="Clear university search"
                onChangeText={updateQuery}
                onFocus={scrollSearchToTop}
              />
              {searching ? (
                <StatusPill
                  label="Searching universities"
                  tone="info"
                  loading
                />
              ) : null}
              {error ? <FeedbackBanner message={error} tone="danger" /> : null}
            </Card>
          </View>

          {showSearchPrompt ? (
            <View
              style={{
                alignItems: 'center',
                gap: theme.spacing.sm,
                paddingHorizontal: theme.spacing.xl,
                paddingVertical: theme.spacing.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.card,
                backgroundColor: theme.colors.surfaceSubtle,
              }}
            >
              <Ionicons
                name="search-circle-outline"
                size={38}
                color={theme.colors.primary}
              />
              <View style={{ gap: theme.spacing.xxs }}>
                <AppText variant="label" style={{ textAlign: 'center' }}>
                  Type at least two letters to search
                </AppText>
                <AppText
                  color="muted"
                  variant="caption"
                  style={{ textAlign: 'center' }}
                >
                  You’ll choose from verified university records.
                </AppText>
              </View>
            </View>
          ) : null}

          {showEmptyResults ? (
            <View
              accessibilityLiveRegion="polite"
              style={{
                alignItems: 'center',
                gap: theme.spacing.sm,
                padding: theme.spacing.xl,
              }}
            >
              <Ionicons
                name="map-outline"
                size={34}
                color={theme.colors.textMuted}
              />
              <AppText variant="cardTitle" style={{ textAlign: 'center' }}>
                No universities found
              </AppText>
              <AppText color="muted" style={{ textAlign: 'center' }}>
                Check the spelling or try a shorter school name.
              </AppText>
            </View>
          ) : null}

          {results.length ? (
            <View style={{ gap: theme.spacing.sm }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: theme.spacing.sm,
                }}
              >
                <AppText variant="section">Choose your university</AppText>
                <AppText color="muted" variant="caption">
                  {results.length} {results.length === 1 ? 'result' : 'results'}
                </AppText>
              </View>
              {results.map((university) => {
                const mapped = university.status === 'mapped';
                const pending = university.status === 'pending';
                return (
                  <Card
                    key={university.id}
                    accessibilityLabel={`Select ${university.name}`}
                    onPress={() => void choose(university)}
                    accent={
                      mapped
                        ? theme.colors.success
                        : pending
                          ? theme.colors.warning
                          : theme.colors.primary
                    }
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        flexShrink: 0,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: theme.radii.field,
                        backgroundColor: theme.colors.primarySurface,
                      }}
                    >
                      <Ionicons
                        name="business-outline"
                        size={22}
                        color={theme.colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1, gap: theme.spacing.xs }}>
                      <View style={{ gap: theme.spacing.xxs }}>
                        <AppText variant="cardTitle">{university.name}</AppText>
                        <AppText color="muted">
                          {university.city}, {university.state}
                        </AppText>
                      </View>
                      <StatusPill
                        label={
                          mapped
                            ? (university.club?.name ?? 'Club available')
                            : pending
                              ? 'Club setup pending'
                              : 'Start a club'
                        }
                        tone={
                          mapped ? 'success' : pending ? 'warning' : 'neutral'
                        }
                        icon={
                          mapped
                            ? 'checkmark-circle'
                            : pending
                              ? 'time'
                              : 'add-circle'
                        }
                      />
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={22}
                      color={theme.colors.textMuted}
                    />
                  </Card>
                );
              })}
            </View>
          ) : null}

        </View>
      </Screen>
    </>
  );
};

export default UniversitySearchScreen;
