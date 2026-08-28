import { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';

import { useRouter } from 'expo-router';

import {
  AppText,
  CardListSkeleton,
  EmptyState,
  ErrorState,
  FeedbackBanner,
  SearchField,
  SegmentedControl,
} from '@/components/design';
import { RestrictedScreen } from '@/components/access';
import { useFocusTask } from '@/components/hooks/useFocusTask';
import { WhitelistItem } from '@/components/items/WhitelistItem';
import { virtualizedListPerformanceProps } from '@/components/collections/virtualizedListPerformance';
import { appModules } from '@/composition/appModules';
import {
  WhitelistApplication,
  canAccessRolePolicy,
  parseUser,
  roleAccessPolicies,
} from '@/core/domain';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

type ApplicationFilter = 'all' | 'code-word' | 'no-code-word';

const ManageWhitelist = () => {
  const router = useRouter();
  const { user } = useAuth();
  const actor = parseUser(user);
  const theme = useAppTheme();
  const authorized = canAccessRolePolicy(
    actor.role,
    roleAccessPolicies.manageMembershipApplications,
  );
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(authorized);
  const [error, setError] = useState<string>();
  const [applications, setApplications] = useState<readonly WhitelistApplication[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ApplicationFilter>('all');

  const load = useCallback((isActive: () => boolean = () => true) => {
    if (!authorized) return;
    setLoading(true);
    setError(undefined);
    void appModules.whitelist.list(actor).then((result) => {
      if (!isActive()) return;
      setLoading(false);
      if (result.ok) setApplications(result.value);
      else setError(result.error.message);
    });
  }, [actor.id, authorized]);
  useFocusTask(load);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleApplications = applications
    .filter((application) => {
      const hasCodeWord = Boolean(application.codeWord.trim());
      const matchesFilter = filter === 'all' ||
        (filter === 'code-word' && hasCodeWord) ||
        (filter === 'no-code-word' && !hasCodeWord);
      const matchesQuery = !normalizedQuery || [
        application.name,
        application.email,
        application.graduationYear,
        application.codeWord,
      ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
      return matchesFilter && matchesQuery;
    })
    .sort((left, right) =>
      left.graduationYear.localeCompare(right.graduationYear) ||
      left.name.localeCompare(right.name),
    );

  return (
    <RestrictedScreen
      title="Whitelist applications"
      eyebrow="Officer tools"
      onBack={() => router.back()}
      access={{
        policy: roleAccessPolicies.manageMembershipApplications,
        role: actor.role,
      }}
    >
      {loading ? (
        <CardListSkeleton
          label="Loading whitelist applications"
          layout="actions"
        />
      ) : error ? (
        <ErrorState title="Could not load applications" message={error} onRetry={load} />
      ) : (
        <View style={{ flex: 1, gap: theme.spacing.sm }}>
          <SearchField
            accessibilityLabel="Search whitelist applications"
            placeholder="Search name, email, year, or code word"
            value={query}
            onChangeText={setQuery}
          />
          <SegmentedControl
            label="Whitelist application filter"
            value={filter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'code-word', label: 'Has code word' },
              { value: 'no-code-word', label: 'No code word' },
            ]}
            onChange={setFilter}
          />
          <AppText color="muted" variant="caption" accessibilityLiveRegion="polite">
            {visibleApplications.length} pending {visibleApplications.length === 1 ? 'application' : 'applications'}
          </AppText>
          {busy ? <FeedbackBanner message="Updating application…" tone="info" /> : null}
          <FlatList
            {...virtualizedListPerformanceProps}
            data={visibleApplications}
            keyExtractor={({ id }) => id}
            renderItem={({ item }) => (
              <WhitelistItem
                actor={actor}
                application={item}
                onChanged={load}
                setBusy={setBusy}
              />
            )}
            contentContainerStyle={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.xl }}
            ListEmptyComponent={(
              <EmptyState
                title={query || filter !== 'all'
                  ? 'No matching applications'
                  : 'No pending applications'}
                message={query || filter !== 'all'
                  ? 'Try another search or application filter.'
                  : 'New membership requests will appear here for review.'}
              />
            )}
          />
        </View>
      )}
    </RestrictedScreen>
  );
};

export default ManageWhitelist;
