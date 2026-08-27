import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';

import { useRouter } from 'expo-router';

import { RestrictedScreen } from '@/components/access';
import {
  AccessBanner,
  Button,
  Card,
  CardListSkeleton,
  EmptyState,
  ErrorState,
  FeedbackBanner,
  FormSection,
  IconButton,
} from '@/components/design';
import { FormTextInput } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import {
  CatalogTag,
  Outcome,
  canAccessRolePolicy,
  parseUser,
  roleAccessPolicies,
} from '@/core/domain';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

const ManageCatalogTags = () => {
  const router = useRouter();
  const actor = parseUser(useAuth().user);
  const theme = useAppTheme();
  const authorized = canAccessRolePolicy(
    actor.role,
    roleAccessPolicies.manageCatalogTags,
  );
  const [tags, setTags] = useState<readonly CatalogTag[]>([]);
  const [savedTags, setSavedTags] = useState<readonly CatalogTag[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [loading, setLoading] = useState(authorized);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();

  const load = useCallback(async () => {
    if (!authorized) return;
    setLoading(true);
    setError(undefined);
    const result = await appModules.catalogTags.list(actor);
    setLoading(false);
    if (result.ok) {
      setTags(result.value);
      setSavedTags(result.value);
    } else setError(result.error.message);
  }, [actor.id, authorized]);

  useEffect(() => {
    void load();
  }, [load]);

  const savedLabels = useMemo(
    () => new Map(savedTags.map(({ id, label }) => [id, label])),
    [savedTags],
  );

  const save = async () => {
    if (busy) return;
    const changed = tags.filter((tag) => savedLabels.get(tag.id) !== tag.label);
    if (changed.length === 0) {
      setMessage('Catalog tags are already up to date.');
      return;
    }
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    const failed = await updateCatalogTagsSequentially(
      changed,
      (tag) => appModules.catalogTags.update(actor, tag.id, tag.label),
    );
    if (failed && !failed.ok) {
      setBusy(false);
      setError(failed.error.message);
      return;
    }
    setBusy(false);
    setSavedTags(tags);
    setMessage('Catalog tags saved.');
  };

  const add = async () => {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    const result = await appModules.catalogTags.create(actor, newLabel);
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setTags((current) => [...current, result.value]);
    setSavedTags((current) => [...current, result.value]);
    setNewLabel('');
    setMessage(`${result.value.label} was added.`);
  };

  const confirmRemove = (tag: CatalogTag) => {
    if (busy) return;
    Alert.alert(
      'Delete Catalog Tag',
      `Delete ${tag.label}? It will be removed from every cat profile.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setBusy(true);
            setError(undefined);
            void appModules.catalogTags.remove(actor, tag.id).then((result) => {
              setBusy(false);
              if (!result.ok) {
                setError(result.error.message);
                return;
              }
              setTags((current) => current.filter(({ id }) => id !== tag.id));
              setSavedTags((current) =>
                current.filter(({ id }) => id !== tag.id),
              );
              setMessage(`${tag.label} was deleted.`);
            });
          },
        },
      ],
    );
  };

  return (
    <RestrictedScreen
      scroll
      keyboardAware
      title="Manage catalog tags"
      eyebrow="Officer tools"
      onBack={() => router.back()}
      access={{ policy: roleAccessPolicies.manageCatalogTags, role: actor.role }}
    >
      {loading ? (
        <CardListSkeleton label="Loading catalog tags" count={4} />
      ) : error && tags.length === 0 ? (
        <ErrorState title="Could not load catalog tags" message={error} onRetry={load} />
      ) : (
        <View style={{ gap: theme.spacing.lg }}>
          <AccessBanner
            title="Catalog tags"
            message="These tags appear on cat profiles and in the catalog filter. Existing status-based tags are included as the default set."
          />
          {error ? <FeedbackBanner message={error} tone="danger" /> : null}
          {message ? <FeedbackBanner message={message} tone="success" /> : null}
          <FormSection title="Configured tags">
            {tags.length === 0 ? (
              <EmptyState
                title="No catalog tags"
                message="Add a tag below to start organizing cat profiles."
              />
            ) : (
              tags.map((tag, index) => (
                <Card key={tag.id} accent={theme.colors.teal}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-end',
                      gap: theme.spacing.sm,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <FormTextInput
                        label={`Tag name ${index + 1}`}
                        required
                        value={tag.label}
                        onChangeText={(label) =>
                          setTags((current) =>
                            current.map((currentTag) =>
                              currentTag.id === tag.id
                                ? { ...currentTag, label }
                                : currentTag,
                            ),
                          )
                        }
                      />
                    </View>
                    <IconButton
                      icon="trash-outline"
                      accessibilityLabel={`Delete ${tag.label}`}
                      variant="danger"
                      disabled={busy}
                      onPress={() => confirmRemove(tag)}
                    />
                  </View>
                </Card>
              ))
            )}
            <Button
              label="Save tag changes"
              fullWidth
              loading={busy}
              onPress={() => void save()}
            />
          </FormSection>
          <FormSection title="Add a tag">
            <FormTextInput
              label="New tag name"
              required
              value={newLabel}
              placeholder="Needs medication"
              onChangeText={setNewLabel}
            />
            <Button
              label="Add tag"
              icon="add-circle-outline"
              fullWidth
              loading={busy}
              onPress={() => void add()}
            />
          </FormSection>
        </View>
      )}
    </RestrictedScreen>
  );
};

export async function updateCatalogTagsSequentially(
  tags: readonly CatalogTag[],
  update: (tag: CatalogTag) => Promise<Outcome<CatalogTag>>,
): Promise<Outcome<CatalogTag> | undefined> {
  for (const tag of tags) {
    const result = await update(tag);
    if (!result.ok) return result;
  }
  return undefined;
}

export default ManageCatalogTags;
