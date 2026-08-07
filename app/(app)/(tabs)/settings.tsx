import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, View } from 'react-native';

import { useRouter } from 'expo-router';

import { roleLabel } from '@/components/administration/rolePresentation';
import {
  AccessBanner,
  AppHeader,
  AppText,
  Button,
  Card,
  CardListSkeleton,
  EmptyState,
  FeedbackBanner,
  FormSection,
  IconButton,
  ListRow,
  Screen,
  StatusPill,
} from '@/components/design';
import { FormTextInput } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import {
  Role,
  canManageAppSettings,
  canManageFeature,
  parseUser,
} from '@/core/domain';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

interface EditableContact {
  readonly id: string;
  readonly isNew?: boolean;
  readonly name: string;
  readonly email: string;
  readonly instagramUrl: string;
  readonly facebookUrl: string;
  readonly websiteUrl: string;
}

type EditableContactField = Exclude<keyof EditableContact, 'id' | 'isNew'>;

const Settings = () => {
  const { signOut, user } = useAuth();
  const actor = parseUser(user);
  const isAdmin = canManageFeature(actor.role);
  const router = useRouter();
  const theme = useAppTheme();
  const [isEditable, setIsEditable] = useState(false);
  const [contacts, setContacts] = useState<readonly EditableContact[]>([]);
  const [hasChanged, setHasChanged] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [savingContacts, setSavingContacts] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string>();

  const loadContacts = useCallback(async () => {
    setLoadingContacts(true);
    setError(undefined);
    const result = await appModules.contacts.list(actor);
    setLoadingContacts(false);
    if (result.ok) setContacts(result.value);
    else setError(result.error.message);
  }, [actor.id]);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  const changeContact = (
    id: string,
    field: EditableContactField,
    value: string,
  ) => {
    setContacts((current) =>
      current.map((contact) =>
        contact.id === id ? { ...contact, [field]: value } : contact,
      ),
    );
    setHasChanged(true);
  };

  const saveContacts = async () => {
    if (savingContacts) return;
    if (!hasChanged) {
      setIsEditable(false);
      return;
    }
    setSavingContacts(true);
    setError(undefined);
    const results = await Promise.all(
      contacts.map(
        ({ id, isNew, name, email, instagramUrl, facebookUrl, websiteUrl }) =>
          isNew
            ? appModules.contacts.create(actor, {
                name,
                email,
                instagramUrl,
                facebookUrl,
                websiteUrl,
              })
            : appModules.contacts.update(actor, id, {
                name,
                email,
                instagramUrl,
                facebookUrl,
                websiteUrl,
              }),
      ),
    );
    setContacts(
      contacts.map((contact, index) => {
        const result = results[index];
        return result?.ok ? result.value : contact;
      }),
    );
    const failed = results.find((result) => !result.ok);
    setSavingContacts(false);
    if (failed && !failed.ok) {
      setError(failed.error.message);
      return;
    }
    setHasChanged(false);
    setIsEditable(false);
    await loadContacts();
  };

  const deleteContact = (contact: EditableContact) => {
    if (contact.isNew) {
      setContacts((current) => current.filter(({ id }) => id !== contact.id));
      return;
    }
    Alert.alert('Delete Contact', `Delete ${contact.name || 'this contact'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setSavingContacts(true);
          void appModules.contacts.remove(actor, contact.id).then((result) => {
            setSavingContacts(false);
            if (result.ok) {
              setContacts((current) =>
                current.filter(({ id }) => id !== contact.id),
              );
            } else setError(result.error.message);
          });
        },
      },
    ]);
  };

  const logout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setError(undefined);
    try {
      await signOut();
      router.replace('/login');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please try again.');
      setSigningOut(false);
    }
  };

  return (
    <Screen scroll keyboardAware>
      <AppHeader title="More" eyebrow="Campus Cats field guide" />
      <View style={{ gap: theme.spacing.lg }}>
        {error ? <FeedbackBanner message={error} tone="danger" /> : null}

        {!isAdmin ? (
          <AccessBanner
            title="Officer-only tools"
            message="Feeding stations and administrative tools are available only to officers, so they do not appear in your navigation."
          />
        ) : null}

        <FormSection title="Account">
          <Card accent={theme.colors.primary}>
            <View style={{ gap: theme.spacing.sm }}>
              <AppText variant="cardTitle" selectable>
                {actor.email}
              </AppText>
              <StatusPill
                label={roleLabel(actor.role)}
                tone={actor.role === Role.Member ? 'neutral' : 'primary'}
                icon={
                  actor.role === Role.Member
                    ? 'person-outline'
                    : 'shield-checkmark-outline'
                }
              />
              <Button
                label="View My Profile"
                icon="person-circle-outline"
                variant="secondary"
                onPress={() =>
                  router.push({
                    pathname: '/profile/view-profile',
                    params: { id: actor.id },
                  })
                }
              />
              <Button
                label="iNaturalist Account"
                icon="leaf-outline"
                variant="secondary"
                onPress={() =>
                  router.push('/settings/inaturalist-account' as never)
                }
              />
              <Button
                label="Sign Out"
                icon="log-out-outline"
                variant="secondary"
                loading={signingOut}
                onPress={() => void logout()}
              />
            </View>
          </Card>
        </FormSection>

        <FormSection
          title="Club contacts"
          action={
            isAdmin ? (
              <IconButton
                accessibilityLabel={
                  isEditable ? 'Save Contacts' : 'Edit Contacts'
                }
                icon={isEditable ? 'checkmark' : 'create-outline'}
                variant={isEditable ? 'primary' : 'surface'}
                disabled={savingContacts}
                onPress={() =>
                  isEditable ? void saveContacts() : setIsEditable(true)
                }
              />
            ) : undefined
          }
        >
          {loadingContacts ? (
            <CardListSkeleton label="Loading club contacts" count={2} />
          ) : contacts.length === 0 ? (
            <EmptyState
              title="No contacts yet"
              message="Officer contact information will appear here when available."
            />
          ) : (
            contacts.map((contact) =>
              isAdmin && isEditable ? (
                <Card key={contact.id} accent={theme.colors.gold}>
                  <View style={{ gap: theme.spacing.sm }}>
                    <FormTextInput
                      label="Contact name"
                      required
                      value={contact.name}
                      onChangeText={(value) =>
                        changeContact(contact.id, 'name', value)
                      }
                    />
                    <FormTextInput
                      label="Contact email"
                      required
                      value={contact.email}
                      onChangeText={(value) =>
                        changeContact(contact.id, 'email', value)
                      }
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                    <FormTextInput
                      label="Instagram link"
                      value={contact.instagramUrl}
                      onChangeText={(value) =>
                        changeContact(contact.id, 'instagramUrl', value)
                      }
                      autoCapitalize="none"
                      autoCorrect={false}
                      inputMode="url"
                      keyboardType="url"
                    />
                    <FormTextInput
                      label="Facebook link"
                      value={contact.facebookUrl}
                      onChangeText={(value) =>
                        changeContact(contact.id, 'facebookUrl', value)
                      }
                      autoCapitalize="none"
                      autoCorrect={false}
                      inputMode="url"
                      keyboardType="url"
                    />
                    <FormTextInput
                      label="Website"
                      helper="Optional links must begin with http:// or https://."
                      value={contact.websiteUrl}
                      onChangeText={(value) =>
                        changeContact(contact.id, 'websiteUrl', value)
                      }
                      autoCapitalize="none"
                      autoCorrect={false}
                      inputMode="url"
                      keyboardType="url"
                    />
                    <Button
                      label={`Remove ${contact.name || 'Contact'}`}
                      variant="danger"
                      disabled={savingContacts}
                      onPress={() => deleteContact(contact)}
                    />
                  </View>
                </Card>
              ) : (
                <Card key={contact.id} accent={theme.colors.gold}>
                  <View style={{ gap: theme.spacing.sm }}>
                    <AppText variant="cardTitle">{contact.name}</AppText>
                    <AppText color="muted" selectable>
                      {contact.email}
                    </AppText>
                    {contact.instagramUrl ||
                    contact.facebookUrl ||
                    contact.websiteUrl ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: theme.spacing.xs,
                        }}
                      >
                        {contact.instagramUrl ? (
                          <Button
                            label="Instagram"
                            icon="logo-instagram"
                            variant="tertiary"
                            size="small"
                            onPress={() =>
                              void Linking.openURL(contact.instagramUrl)
                            }
                          />
                        ) : null}
                        {contact.facebookUrl ? (
                          <Button
                            label="Facebook"
                            icon="logo-facebook"
                            variant="tertiary"
                            size="small"
                            onPress={() =>
                              void Linking.openURL(contact.facebookUrl)
                            }
                          />
                        ) : null}
                        {contact.websiteUrl ? (
                          <Button
                            label="Website"
                            icon="globe-outline"
                            variant="tertiary"
                            size="small"
                            onPress={() =>
                              void Linking.openURL(contact.websiteUrl)
                            }
                          />
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                </Card>
              ),
            )
          )}
          {isAdmin && isEditable ? (
            <Button
              label="Add Contact"
              icon="add-circle-outline"
              variant="tertiary"
              disabled={savingContacts}
              onPress={() => {
                setContacts((current) => [
                  ...current,
                  {
                    id: `new-${current.length}`,
                    isNew: true,
                    name: '',
                    email: '',
                    instagramUrl: '',
                    facebookUrl: '',
                    websiteUrl: '',
                  },
                ]);
                setHasChanged(true);
              }}
            />
          ) : null}
        </FormSection>

        {isAdmin ? (
          <FormSection title="Officer tools">
            <ListRow
              title="Manage Catalog Tags"
              subtitle="Create and organize tags used on cat profiles"
              icon="pricetags-outline"
              onPress={() => router.push('/settings/catalog-tags' as never)}
            />
            <ListRow
              title="Manage Users"
              subtitle="Review roles and remove accounts"
              icon="people-outline"
              onPress={() => router.push('/settings/manage_users')}
            />
            <ListRow
              title="Manage Whitelist"
              subtitle="Review membership applications"
              icon="clipboard-outline"
              onPress={() => router.push('/settings/manage_whitelist')}
            />
            <ListRow
              title="iNaturalist Sync"
              subtitle="Review imports, retry synchronization, and moderate records"
              icon="leaf-outline"
              onPress={() => router.push('/settings/inaturalist')}
            />
            <ListRow
              title="App Billing"
              subtitle={appModules.billing.presentation.settingsSubtitle}
              icon="card-outline"
              onPress={() => router.push('/settings/billing')}
            />
          </FormSection>
        ) : null}

        {canManageAppSettings(actor.role) ? (
          <FormSection title="President tools">
            <ListRow
              title="App Settings"
              subtitle="Change branding and contributor privacy"
              icon="color-palette-outline"
              onPress={() => router.push('/settings/app-settings' as never)}
            />
          </FormSection>
        ) : null}
      </View>
    </Screen>
  );
};

export default Settings;
