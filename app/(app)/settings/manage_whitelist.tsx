import { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import {
  AccessDeniedState,
  AppHeader,
  EmptyState,
  ErrorState,
  FeedbackBanner,
  Screen,
} from '@/components/design';
import { WhitelistItem } from '@/components/items/WhitelistItem';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { appModules } from '@/composition/appModules';
import { WhitelistApplication, canManageFeature, parseUser } from '@/core/domain';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

const ManageWhitelist = () => {
  const router = useRouter();
  const { user } = useAuth();
  const actor = parseUser(user);
  const theme = useAppTheme();
  const authorized = canManageFeature(actor.role);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(authorized);
  const [error, setError] = useState<string>();
  const [applications, setApplications] = useState<readonly WhitelistApplication[]>([]);

  const load = useCallback(() => {
    if (!authorized) return;
    setLoading(true);
    setError(undefined);
    void appModules.whitelist.list(actor).then((result) => {
      setLoading(false);
      if (result.ok) setApplications(result.value);
      else setError(result.error.message);
    });
  }, [actor.id, authorized]);
  useFocusEffect(load);

  return (
    <Screen>
      <AppHeader
        title="Whitelist applications"
        eyebrow="Officer tools"
        onBack={() => router.back()}
      />
      {!authorized ? (
        <AccessDeniedState message="Only administrators may review membership applications." />
      ) : loading ? (
        <LoadingIndicator label="Loading whitelist applications" />
      ) : error ? (
        <ErrorState title="Could not load applications" message={error} onRetry={load} />
      ) : (
        <View style={{ flex: 1, gap: theme.spacing.sm }}>
          {busy ? <FeedbackBanner message="Updating application…" tone="info" /> : null}
          <FlatList
            data={applications}
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
                title="No pending applications"
                message="New membership requests will appear here for review."
              />
            )}
          />
        </View>
      )}
    </Screen>
  );
};

export default ManageWhitelist;
