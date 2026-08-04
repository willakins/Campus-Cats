import { useCallback, useState } from 'react';
import { FlatList } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import {
  AccessDeniedState,
  AppHeader,
  EmptyState,
  ErrorState,
  Screen,
} from '@/components/design';
import { UserItem } from '@/components/items/UserItem';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { appModules } from '@/composition/appModules';
import { User, canManageFeature, parseUser } from '@/core/domain';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

const ManageUsers = () => {
  const router = useRouter();
  const { user } = useAuth();
  const actor = parseUser(user);
  const theme = useAppTheme();
  const authorized = canManageFeature(actor.role);
  const [users, setUsers] = useState<readonly User[]>([]);
  const [loading, setLoading] = useState(authorized);
  const [error, setError] = useState<string>();

  const load = useCallback(() => {
    if (!authorized) return;
    setLoading(true);
    setError(undefined);
    void appModules.users.list(actor).then((result) => {
      setLoading(false);
      if (result.ok) setUsers(result.value);
      else setError(result.error.message);
    });
  }, [actor.id, authorized]);
  useFocusEffect(load);

  return (
    <Screen>
      <AppHeader
        title="Manage users"
        eyebrow="Officer tools"
        onBack={() => router.back()}
      />
      {!authorized ? (
        <AccessDeniedState message="Only administrators may manage member accounts." />
      ) : loading ? (
        <LoadingIndicator label="Loading users" />
      ) : error ? (
        <ErrorState title="Could not load users" message={error} onRetry={load} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={({ id }) => id}
          renderItem={({ item }) => <UserItem actor={actor} user={item} onChanged={load} />}
          contentContainerStyle={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.xl }}
          ListEmptyComponent={(
            <EmptyState
              title="No users to manage"
              message="Eligible member accounts will appear here."
            />
          )}
        />
      )}
    </Screen>
  );
};

export default ManageUsers;
