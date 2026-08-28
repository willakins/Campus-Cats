import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, View } from 'react-native';

import { useRouter } from 'expo-router';

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
} from '@/components/design';
import { FormTextInput } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import {
  canAccessRolePolicy,
  parseUser,
  roleAccessPolicies,
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
  const { user } = useAuth();
  const actor = parseUser(user);
  const canManageContacts = canAccessRolePolicy(
    actor.role,
    roleAccessPolicies.manageContacts,
  );
  const canManageCatalogTags = canAccessRolePolicy(
    actor.role,
    roleAccessPolicies.manageCatalogTags,
  );
  const canManageUsers = canAccessRolePolicy(
    actor.role,
    roleAccessPolicies.manageUsers,
  );
  const canManageMembershipApplications = canAccessRolePolicy(
    actor.role,
    roleAccessPolicies.manageMembershipApplications,
  );
  const canManageInaturalist = canAccessRolePolicy(
    actor.role,
    roleAccessPolicies.manageInaturalist,
  );
  const hasOfficerTools =
    canManageCatalogTags ||
    canManageUsers ||
    canManageMembershipApplications ||
    canManageInaturalist;
  const canManageBilling = canAccessRolePolicy(
    actor.role,
    roleAccessPolicies.manageClubBilling,
  );
  const canManageSettings = canAccessRolePolicy(
    actor.role,
    roleAccessPolicies.manageAppSettings,
  );
  const canViewInfrastructureCosts = canAccessRolePolicy(
    actor.role,
    roleAccessPolicies.viewInfrastructureCosts,
  );
  const hasPresidentTools = canManageBilling || canManageSettings;
  const router = useRouter();
  const theme = useAppTheme();
  const [isEditable, setIsEditable] = useState(false);
  const [contacts, setContacts] = useState<readonly EditableContact[]>([]);
  const [hasChanged, setHasChanged] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [savingContacts, setSavingContacts] = useState(false);
  const [error, setError] = useState<string>();

  const loadContacts = useCallback(async (
    isActive: () => boolean = () => true,
  ) => {
    setLoadingContacts(true);
    setError(undefined);
    const result = await appModules.contacts.list(actor);
    if (!isActive()) return;
    setLoadingContacts(false);
    if (result.ok) setContacts(result.value);
    else setError(result.error.message);
  }, [actor.id]);

  useEffect(() => {
    let active = true;
    void loadContacts(() => active);
    return () => {
      active = false;
    };
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

  return (
    <Screen scroll keyboardAware>
      <AppHeader
        title="More"
        eyebrow="Campus Cats field guide"
        action={
          <IconButton
            accessibilityLabel="Open profile"
            icon="person-circle-outline"
            onPress={() =>
              router.push({
                pathname: '/profile/view-profile',
                params: { id: actor.id },
              })
            }
          />
        }
      />
      <View style={{ gap: theme.spacing.lg }}>
        {error ? <FeedbackBanner message={error} tone="danger" /> : null}

        <FormSection title="Legal and privacy">
          <ListRow
            title="Terms of Service"
            subtitle="Rules for using Campus Cats"
            icon="document-text-outline"
            onPress={() => router.push('/legal/terms' as never)}
          />
          <ListRow
            title="Privacy Policy"
            subtitle="How Campus Cats handles your information"
            icon="shield-checkmark-outline"
            onPress={() => router.push('/legal/privacy' as never)}
          />
          <ListRow
            title="Account and data"
            subtitle="Manage or permanently delete your account"
            icon="person-circle-outline"
            onPress={() => router.push('/settings/account')}
          />
        </FormSection>

        {!hasOfficerTools ? (
          <AccessBanner
            title="Officer-only tools"
            message="Feeding stations and administrative tools are available only to officers, so they do not appear in your navigation."
          />
        ) : null}

        <FormSection
          title="Club contacts"
          action={
            canManageContacts ? (
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
            <CardListSkeleton label="Loading club contacts" count={1} />
          ) : contacts.length === 0 ? (
            <EmptyState
              title="No contacts yet"
              message="Officer contact information will appear here when available."
            />
          ) : (
            contacts.map((contact) =>
              canManageContacts && isEditable ? (
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
                <View key={contact.id} style={{ gap: theme.spacing.xxs }}>
                  <AppText variant="label">{contact.name}</AppText>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: theme.spacing.xxs,
                    }}
                  >
                    <Button
                      label={contact.email}
                      icon="mail-outline"
                      variant="tertiary"
                      size="small"
                      onPress={() =>
                        void Linking.openURL(`mailto:${contact.email}`)
                      }
                    />
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
                </View>
              ),
            )
          )}
          {canManageContacts && isEditable ? (
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

        {hasOfficerTools ? (
          <FormSection title="Officer tools">
            {canManageCatalogTags ? <ListRow
              title="Manage Catalog Tags"
              subtitle="Create and organize tags used on cat profiles"
              icon="pricetags-outline"
              onPress={() => router.push('/settings/catalog-tags' as never)}
            /> : null}
            {canManageUsers ? <ListRow
              title="Manage Users"
              subtitle="Review roles and remove accounts"
              icon="people-outline"
              onPress={() => router.push('/settings/manage_users')}
            /> : null}
            {canManageMembershipApplications ? <ListRow
              title="Manage Whitelist"
              subtitle="Review membership applications"
              icon="clipboard-outline"
              onPress={() => router.push('/settings/manage_whitelist')}
            /> : null}
            {canManageInaturalist ? <ListRow
              title="iNaturalist Sync"
              subtitle="Review imports, retry synchronization, and moderate records"
              icon="leaf-outline"
              onPress={() => router.push('/settings/inaturalist')}
            /> : null}
          </FormSection>
        ) : null}

        {hasPresidentTools ? (
          <FormSection title="President tools">
            {canManageBilling ? <ListRow
              title="Club Billing"
              subtitle="Manage invoices, payment method, and subscription"
              icon="card-outline"
              onPress={() => router.push('/settings/club-billing' as never)}
            /> : null}
            {canManageSettings ? <ListRow
              title="App Settings"
              subtitle="Change branding and contributor privacy"
              icon="color-palette-outline"
              onPress={() => router.push('/settings/app-settings' as never)}
            /> : null}
          </FormSection>
        ) : null}

        {canViewInfrastructureCosts ? (
          <FormSection title="Platform administration">
            <ListRow
              title="Infrastructure Costs"
              subtitle={appModules.billing.presentation.settingsSubtitle}
              icon="cloud-outline"
              onPress={() => router.push('/settings/billing')}
            />
          </FormSection>
        ) : null}
      </View>
    </Screen>
  );
};

export default Settings;
