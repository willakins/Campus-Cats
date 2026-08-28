import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthScaffold, AuthTextField } from '@/components/auth';
import {
  AppText,
  Card,
  FeedbackBanner,
  StatusPill,
} from '@/components/design';
import { appModules } from '@/composition/appModules';
import { UniversitySearchResult } from '@/core/domain';
import { useUniversitySelection } from '@/providers';
import { useAppTheme } from '@/theme';

const UniversitySearchScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const { selectUniversity } = useUniversitySelection();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<readonly UniversitySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    const normalized = query.trim();
    if (normalized.length < 2) {
      setResults([]);
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
          setError(undefined);
        } else setError(result.error.message);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  const choose = async (university: UniversitySearchResult) => {
    const selected = await selectUniversity(university);
    if (!selected.ok) {
      setError(selected.error.message);
      return;
    }
    router.replace(
      university.status === 'mapped'
        ? '/login'
        : university.status === 'pending'
          ? ('/club-setup/pending' as never)
          : ('/club-setup' as never),
    );
  };

  return (
    <AuthScaffold
      title="Find your university"
      subtitle="Choose a listed U.S. college or university to find its Campus Cats club."
    >
      <AuthTextField
        label="University"
        value={query}
        placeholder="Start typing a university name"
        autoCapitalize="words"
        autoCorrect={false}
        onChangeText={setQuery}
      />
      {searching ? <StatusPill label="Searching universities" tone="info" loading /> : null}
      {error ? <FeedbackBanner message={error} tone="danger" /> : null}
      {!searching && query.trim().length >= 2 && !results.length && !error ? (
        <AppText color="muted">No matching universities found.</AppText>
      ) : null}
      <View style={{ gap: theme.spacing.sm }}>
        {results.map((university) => (
          <Card
            key={university.id}
            accessibilityLabel={`Select ${university.name}`}
            onPress={() => void choose(university)}
            style={{ gap: theme.spacing.xs }}
          >
            <AppText variant="cardTitle">{university.name}</AppText>
            <AppText color="muted">
              {university.city}, {university.state}
            </AppText>
            <StatusPill
              label={
                university.status === 'mapped'
                  ? university.club?.name ?? 'Club available'
                  : university.status === 'pending'
                    ? 'Club setup pending'
                    : 'Start a club'
              }
              tone={
                university.status === 'mapped'
                  ? 'success'
                  : university.status === 'pending'
                    ? 'warning'
                    : 'primary'
              }
            />
          </Card>
        ))}
      </View>
      <AppText color="muted" variant="caption" style={{ textAlign: 'center' }}>
        You must select a university from these verified results.
      </AppText>
    </AuthScaffold>
  );
};

export default UniversitySearchScreen;
