import { useCallback, useState } from 'react';
import { SectionList, View } from 'react-native';

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
import { roleLabel } from '@/components/administration/rolePresentation';
import { virtualizedListPerformanceProps } from '@/components/collections/virtualizedListPerformance';
import { UserItem } from '@/components/items/UserItem';
import { appModules } from '@/composition/appModules';
import {
  ManagedUser,
  Role,
  canAccessRolePolicy,
  parseManagedUser,
  parseUser,
  roleAccessPolicies,
} from '@/core/domain';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

type UserFilter =
  | 'all'
  | 'members'
  | 'officers'
  | 'leadership'
  | 'banned'
  | 'developers';

const roleOrder: readonly Role[] = [
  Role.Developer,
  Role.President,
  Role.VicePresident,
  Role.Officer,
  Role.Member,
];

const ManageUsers = () => {
  const router = useRouter();
  const { user } = useAuth();
  const actorProfile = parseManagedUser(user);
  const actor = parseUser(actorProfile);
  const theme = useAppTheme();
  const authorized = canAccessRolePolicy(
    actor.role,
    roleAccessPolicies.manageUsers,
  );
  const isDeveloper = actor.role === Role.Developer;
  const [users, setUsers] = useState<readonly ManagedUser[]>([]);
  const [loading, setLoading] = useState(authorized);
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<UserFilter>('all');
  const [successionMessage, setSuccessionMessage] = useState<string>();

  const load = useCallback((isActive: () => boolean = () => true) => {
    if (!authorized) return;
    setLoading(true);
    setError(undefined);
    void appModules.users.list(actor).then((result) => {
      if (!isActive()) return;
      setLoading(false);
      if (result.ok) setUsers(result.value);
      else setError(result.error.message);
    });
  }, [actor.id, authorized]);
  useFocusTask(load);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const developerUsers = users.filter((candidate) =>
    candidate.role === Role.Developer,
  );
  const filterCandidates = filter === 'developers' && isDeveloper
    ? developerUsers.some((candidate) => candidate.id === actor.id)
      ? developerUsers
      : [...developerUsers, actorProfile]
    : users.filter((candidate) => candidate.role !== Role.Developer);
  const visibleUsers = filterCandidates.filter((candidate) => {
    const matchesQuery = !normalizedQuery ||
      candidate.email.toLocaleLowerCase().includes(normalizedQuery) ||
      roleLabel(candidate.role).toLocaleLowerCase().includes(normalizedQuery) ||
      (candidate.banned && 'banned'.includes(normalizedQuery));
    const matchesFilter = filter === 'all' ||
      (filter === 'members' && candidate.role === Role.Member) ||
      (filter === 'officers' && candidate.role === Role.Officer) ||
      (filter === 'leadership' &&
        candidate.role >= Role.VicePresident &&
        candidate.role < Role.Developer) ||
      (filter === 'banned' && candidate.banned) ||
      (filter === 'developers' && candidate.role === Role.Developer);
    return matchesQuery && matchesFilter;
  });
  const sections = roleOrder
    .map((role) => {
      const data = visibleUsers
        .filter((candidate) => candidate.role === role)
        .sort((left, right) => left.email.localeCompare(right.email));
      return {
        role,
        title: filter === 'banned'
          ? `Banned ${roleLabel(role, data.length)}`
          : roleLabel(role, data.length),
        data,
      };
    })
    .filter(({ data }) => data.length > 0);
  const hasPresident = actor.role === Role.President ||
    users.some((candidate) => candidate.role === Role.President);

  return (
    <RestrictedScreen
      title="Manage users"
      eyebrow="Officer tools"
      onBack={() => router.back()}
      access={{ policy: roleAccessPolicies.manageUsers, role: actor.role }}
    >
      {loading ? (
        <CardListSkeleton label="Loading users" layout="actions" />
      ) : error ? (
        <ErrorState title="Could not load users" message={error} onRetry={load} />
      ) : (
        <View style={{ flex: 1, gap: theme.spacing.sm }}>
          <SearchField
            accessibilityLabel="Search users"
            placeholder="Search email or role"
            value={query}
            onChangeText={setQuery}
          />
          <SegmentedControl
            label="User role filter"
            value={filter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'members', label: 'Members' },
              { value: 'officers', label: 'Officers' },
              { value: 'leadership', label: 'Leadership' },
              { value: 'banned', label: 'Banned' },
              ...(isDeveloper
                ? [{ value: 'developers' as const, label: 'Developers' }]
                : []),
            ]}
            onChange={setFilter}
          />
          <AppText color="muted" variant="caption" accessibilityLiveRegion="polite">
            {visibleUsers.length} {visibleUsers.length === 1 ? 'account' : 'accounts'}
          </AppText>
          {successionMessage ? (
            <FeedbackBanner message={successionMessage} tone="success" />
          ) : null}
          <SectionList
          {...virtualizedListPerformanceProps}
          sections={sections}
          keyExtractor={({ id }) => id}
          renderSectionHeader={({ section }) => (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: theme.spacing.sm,
                paddingBottom: theme.spacing.xs,
                backgroundColor: theme.colors.background,
              }}
            >
              <AppText variant="section">{section.title}</AppText>
              <AppText color="muted" variant="caption">{section.data.length}</AppText>
            </View>
          )}
          renderItem={({ item }) => (
            <UserItem
              actor={actor}
              user={item}
              hasPresident={hasPresident}
              readOnly={filter === 'developers'}
              disabled={Boolean(successionMessage) && actor.role === Role.President}
              onChanged={load}
              onPresidencyTransferred={() => setSuccessionMessage(
                actor.role === Role.President
                  ? 'Presidency transferred. Your account is now an Officer.'
                  : hasPresident
                    ? 'Presidency transferred. Your Developer access is unchanged.'
                    : 'The first President has been appointed.',
              )}
            />
          )}
          contentContainerStyle={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.xl }}
          ListEmptyComponent={(
            <EmptyState
              title={query || filter !== 'all' ? 'No matching users' : 'No users to manage'}
              message={query || filter !== 'all'
                ? 'Try another search or role filter.'
                : 'Eligible member accounts will appear here.'}
            />
          )}
          />
        </View>
      )}
    </RestrictedScreen>
  );
};

export default ManageUsers;
