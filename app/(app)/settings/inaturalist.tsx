import { useCallback, useState } from 'react';
import { FlatList, Linking, View } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import {
  AccessDeniedState,
  AppHeader,
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FeedbackBanner,
  FormSection,
  Screen,
  SegmentedControl,
  StatusPill,
} from '@/components/design';
import { FormTextInput } from '@/components/forms';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { appModules } from '@/composition/appModules';
import {
  ImportedCatalogProfile,
  ImportedObservation,
  InaturalistSyncStatus,
  canManageFeature,
  parseUser,
} from '@/core/domain';
import { InaturalistRecordKind } from '@/core/ports';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

type AdministrationRecord =
  | { readonly kind: 'observation'; readonly value: ImportedObservation }
  | { readonly kind: 'catalog'; readonly value: ImportedCatalogProfile };

const formatDate = (value?: Date) =>
  value
    ? value.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Never';

const InaturalistAdministration = () => {
  const router = useRouter();
  const { user } = useAuth();
  const actor = parseUser(user);
  const theme = useAppTheme();
  const authorized = canManageFeature(actor.role);
  const [section, setSection] = useState<InaturalistRecordKind>('catalog');
  const [status, setStatus] = useState<InaturalistSyncStatus>();
  const [observations, setObservations] = useState<readonly ImportedObservation[]>([]);
  const [catalog, setCatalog] = useState<readonly ImportedCatalogProfile[]>([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(authorized);
  const [syncing, setSyncing] = useState(false);
  const [busyRecord, setBusyRecord] = useState<string>();
  const [error, setError] = useState<string>();
  const [feedback, setFeedback] = useState<string>();

  const load = useCallback(() => {
    if (!authorized) return;
    setLoading(true);
    setError(undefined);
    void Promise.all([
      appModules.inaturalist.status(actor),
      appModules.inaturalist.records(actor),
    ]).then(([statusResult, recordsResult]) => {
      setLoading(false);
      if (!statusResult.ok) {
        setError(statusResult.error.message);
        return;
      }
      if (!recordsResult.ok) {
        setError(recordsResult.error.message);
        return;
      }
      setStatus(statusResult.value);
      setObservations(recordsResult.value.observations);
      setCatalog(recordsResult.value.catalog);
    });
  }, [actor.id, authorized]);

  useFocusEffect(load);

  const runSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setFeedback(undefined);
    const result = await appModules.inaturalist.runNow(actor);
    setSyncing(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setFeedback('iNaturalist synchronization completed.');
    load();
  };

  const setVisibility = async (record: AdministrationRecord) => {
    if (busyRecord) return;
    const hidden = record.value.moderation.hidden;
    if (!hidden && !reason.trim()) {
      setFeedback('Enter an audit reason before hiding a record.');
      return;
    }
    const key = `${record.kind}-${record.value.id}`;
    setBusyRecord(key);
    setFeedback(undefined);
    const result = await appModules.inaturalist.setVisibility(
      actor,
      record.kind,
      record.value.id,
      hidden,
      hidden ? '' : reason.trim(),
    );
    setBusyRecord(undefined);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setReason('');
    setFeedback(hidden ? 'Imported record restored.' : 'Imported record hidden.');
    load();
  };

  const records: readonly AdministrationRecord[] =
    section === 'catalog'
      ? catalog.map((value) => ({ kind: 'catalog' as const, value }))
      : observations.map((value) => ({ kind: 'observation' as const, value }));

  if (!authorized) {
    return (
      <Screen>
        <AppHeader title="iNaturalist sync" eyebrow="Officer tools" onBack={() => router.back()} />
        <AccessDeniedState message="Only administrators may manage imported iNaturalist data." />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="iNaturalist sync" eyebrow="Officer tools" onBack={() => router.back()} />
      {loading ? (
        <LoadingIndicator label="Loading iNaturalist synchronization" />
      ) : error ? (
        <ErrorState title="Could not load iNaturalist data" message={error} onRetry={load} />
      ) : (
        <FlatList
          data={records}
          keyExtractor={(record) => `${record.kind}-${record.value.id}`}
          contentContainerStyle={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.xl }}
          ListHeaderComponent={(
            <View style={{ gap: theme.spacing.md, marginBottom: theme.spacing.sm }}>
              {feedback ? <FeedbackBanner message={feedback} tone="info" /> : null}
              <Card accent={theme.colors.teal}>
                <View style={{ gap: theme.spacing.sm }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                    <StatusPill
                      label={status?.running ? 'Sync running' : status?.lastStatus ?? 'Not run'}
                      tone={status?.lastStatus === 'failed' ? 'danger' : status?.lastStatus === 'partial' ? 'warning' : 'success'}
                      icon={status?.running ? 'sync' : 'cloud-done-outline'}
                    />
                    <StatusPill
                      label={`${status?.ambiguousCatalogMatches.length ?? 0} ambiguous links`}
                      tone={(status?.ambiguousCatalogMatches.length ?? 0) > 0 ? 'warning' : 'neutral'}
                      icon="git-compare-outline"
                    />
                  </View>
                  <AppText color="muted">Last completed: {formatDate(status?.completedAt)}</AppText>
                  <AppText color="muted">
                    Observations: {status?.observations.fetched ?? 0} fetched, {status?.observations.deactivated ?? 0} deactivated
                  </AppText>
                  <AppText color="muted">
                    Guide profiles: {status?.catalog.fetched ?? 0} fetched, {status?.catalog.deactivated ?? 0} deactivated
                  </AppText>
                  <Button
                    label="Sync with iNaturalist now"
                    icon="sync"
                    loading={syncing}
                    disabled={status?.running}
                    onPress={() => void runSync()}
                  />
                </View>
              </Card>
              <FormSection title="Imported records">
                <SegmentedControl
                  label="Imported record type"
                  value={section}
                  options={[
                    { value: 'catalog', label: `Cats (${catalog.length})` },
                    { value: 'observation', label: `Sightings (${observations.length})` },
                  ]}
                  onChange={setSection}
                />
                <FormTextInput
                  label="Reason for hiding a record"
                  helper="Required for the audit trail when an officer hides a record."
                  value={reason}
                  maxLength={500}
                  onChangeText={setReason}
                />
              </FormSection>
            </View>
          )}
          renderItem={({ item }) => {
            const imported = item.value;
            const title = item.kind === 'catalog'
              ? item.value.displayName
              : item.value.displayName;
            const subtitle = item.kind === 'catalog'
              ? item.value.shortDescription
              : `${item.value.observer.displayName ?? item.value.observer.login} · ${item.value.observedOn}`;
            const key = `${item.kind}-${imported.id}`;
            return (
              <Card accent={imported.moderation.hidden ? theme.colors.danger : theme.colors.teal}>
                <View style={{ gap: theme.spacing.sm }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                    <StatusPill
                      label={imported.moderation.hidden ? 'Officer hidden' : imported.sourceActive ? 'Visible' : 'Missing at source'}
                      tone={imported.moderation.hidden ? 'danger' : imported.sourceActive ? 'success' : 'warning'}
                      icon={imported.moderation.hidden ? 'eye-off-outline' : imported.sourceActive ? 'eye-outline' : 'cloud-offline-outline'}
                    />
                    {item.kind === 'catalog' && item.value.matchStatus === 'ambiguous' ? (
                      <StatusPill label="Ambiguous local match" tone="warning" icon="git-compare-outline" />
                    ) : null}
                  </View>
                  <AppText variant="cardTitle">{title}</AppText>
                  <AppText color="muted">{subtitle}</AppText>
                  {imported.moderation.reason ? (
                    <AppText variant="caption" color="muted">Reason: {imported.moderation.reason}</AppText>
                  ) : null}
                  <Button
                    label="View on iNaturalist"
                    variant="tertiary"
                    icon="open-outline"
                    onPress={() => void Linking.openURL(imported.sourceUrl)}
                  />
                  {(imported.sourceActive || imported.moderation.hidden) ? (
                    <Button
                      label={imported.moderation.hidden ? `Restore ${title}` : `Hide ${title}`}
                      variant={imported.moderation.hidden ? 'secondary' : 'danger'}
                      loading={busyRecord === key}
                      disabled={Boolean(busyRecord) || (!imported.moderation.hidden && !reason.trim())}
                      onPress={() => void setVisibility(item)}
                    />
                  ) : null}
                </View>
              </Card>
            );
          }}
          ListEmptyComponent={(
            <EmptyState
              title={`No imported ${section === 'catalog' ? 'cats' : 'sightings'}`}
              message="Run the synchronization to import records from iNaturalist."
            />
          )}
        />
      )}
    </Screen>
  );
};

export default InaturalistAdministration;
