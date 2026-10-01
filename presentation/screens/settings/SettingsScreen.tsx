import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';

import { useRouter } from 'expo-router';

import {
  AppText,
  BottomSheet,
  Button,
  Card,
  CardListSkeleton,
  EmptyState,
  FeedbackBanner,
  IconButton,
  ListRow,
  Screen,
  StatusPill,
} from '@/presentation/ui';
import { FormTextInput } from '@/presentation/forms';
import { LegalLinks } from '@/presentation/legal';
import { ProfileAvatar } from '@/presentation/patterns/identity';
import { roleLabel } from '@/presentation/patterns/roles/rolePresentation';
import { appModules } from '@/composition/appModules';
import {
  PublicProfile,
  canAccessRolePolicy,
  parseUser,
  roleAccessPolicies,
} from '@/core/domain';
import { useAuth } from '@/presentation/providers';
import { useAppTheme } from '@/theme';

interface EditableContact {
  readonly id: string;
  readonly isNew?: boolean;
  readonly name: string;
  readonly email: string;
  readonly instagramUrl: string;
  readonly xUrl: string;
  readonly websiteUrls: readonly string[];
}

type EditableContactField = Exclude<
  keyof EditableContact,
  'id' | 'isNew' | 'websiteUrls'
>;

const websiteLabel = (url: string, index: number): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return `Website ${index + 1}`;
  }
};

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
  const hasMoreActions =
    hasOfficerTools || hasPresidentTools || canViewInfrastructureCosts;
  const router = useRouter();
  const theme = useAppTheme();
  const [isEditable, setIsEditable] = useState(false);
  const [contacts, setContacts] = useState<readonly EditableContact[]>([]);
  const [hasChanged, setHasChanged] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [savingContacts, setSavingContacts] = useState(false);
  const [profile, setProfile] = useState<PublicProfile>();
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [error, setError] = useState<string>();

  const loadContacts = useCallback(
    async (isActive: () => boolean = () => true) => {
      setLoadingContacts(true);
      setError(undefined);
      const result = await appModules.contacts.list(actor);
      if (!isActive()) return;
      setLoadingContacts(false);
      if (result.ok) setContacts(result.value.slice(0, 1));
      else setError(result.error.message);
    },
    [actor.id],
  );

  useEffect(() => {
    let active = true;
    void loadContacts(() => active);
    return () => {
      active = false;
    };
  }, [loadContacts]);

  useEffect(() => {
    let active = true;
    void appModules.profiles.get(actor.id).then((result) => {
      if (active && result.ok) setProfile(result.value);
    });
    return () => {
      active = false;
    };
  }, [actor.id]);

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

  const changeWebsite = (id: string, index: number, value: string) => {
    setContacts((current) =>
      current.map((contact) => {
        if (contact.id !== id) return contact;
        const websiteUrls = [...contact.websiteUrls];
        websiteUrls[index] = value;
        return { ...contact, websiteUrls };
      }),
    );
    setHasChanged(true);
  };

  const startEditingContacts = () => {
    if (contacts.length === 0) {
      setContacts([
        {
          id: 'new-0',
          isNew: true,
          name: 'Campus Cats',
          email: '',
          instagramUrl: '',
          xUrl: '',
          websiteUrls: [],
        },
      ]);
      setHasChanged(true);
    }
    setIsEditable(true);
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
        ({ id, isNew, name, email, instagramUrl, xUrl, websiteUrls }) =>
          isNew
            ? appModules.contacts.create(actor, {
                name,
                email,
                instagramUrl,
                xUrl,
                websiteUrls: websiteUrls.filter((url) => url.trim()),
              })
            : appModules.contacts.update(actor, id, {
                name,
                email,
                instagramUrl,
                xUrl,
                websiteUrls: websiteUrls.filter((url) => url.trim()),
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

  return (
    <Screen scroll keyboardAware>
      <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.sm }}>
        {error ? <FeedbackBanner message={error} tone="danger" /> : null}

        <View style={{ gap: theme.spacing.md }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.lg,
              paddingHorizontal: theme.spacing.xs,
            }}
          >
            <ProfileAvatar
              displayName={profile?.displayName ?? actor.email}
              photoUrl={profile?.profilePhotoUrl}
              size={96}
              tone="primary"
            />
            <View style={{ flex: 1, gap: theme.spacing.xxs }}>
              <AppText variant="section">
                {profile?.displayName ?? actor.email.split('@')[0]}
              </AppText>
              <StatusPill
                label={roleLabel(actor.role)}
                tone={actor.role === 0 ? 'neutral' : 'primary'}
                icon={actor.role === 0 ? 'person-outline' : 'shield-checkmark'}
              />
              <AppText variant="caption" color="muted" numberOfLines={1}>
                {actor.email}
              </AppText>
            </View>
            {hasMoreActions ? (
              <IconButton
                accessibilityLabel="More actions"
                icon="ellipsis-horizontal"
                onPress={() => setMoreActionsOpen(true)}
              />
            ) : null}
          </View>
          {profile?.bio ? <AppText>{profile.bio}</AppText> : null}
          <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
            <Button
              label="View profile"
              variant="secondary"
              size="small"
              style={{ flex: 1 }}
              onPress={() =>
                router.push({
                  pathname: '/profiles/[id]',
                  params: { id: actor.id },
                })
              }
            />
            <Button
              label="Edit profile"
              variant="secondary"
              size="small"
              style={{ flex: 1 }}
              onPress={() => router.push('/profiles/edit')}
            />
          </View>
        </View>

        <View
          style={{
            gap: theme.spacing.md,
            paddingTop: theme.spacing.xl,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}
        >
          <View
            style={{
              minHeight: canManageContacts
                ? theme.layout.minTouchTarget
                : undefined,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing.sm,
            }}
          >
            <View style={{ flex: 1, gap: theme.spacing.xxs }}>
              <AppText variant="section">Club contacts</AppText>
              <AppText color="muted">
                Reach the club officers by email or social media.
              </AppText>
            </View>
            {canManageContacts ? (
              <IconButton
                accessibilityLabel={
                  isEditable ? 'Save Contacts' : 'Edit Contacts'
                }
                icon={isEditable ? 'checkmark' : 'create-outline'}
                variant={isEditable ? 'primary' : 'surface'}
                disabled={savingContacts}
                onPress={() =>
                  isEditable ? void saveContacts() : startEditingContacts()
                }
              />
            ) : null}
          </View>
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
                      helper="Optional. Use a complete instagram.com link."
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
                      label="X link"
                      helper="Optional. Use a complete x.com link."
                      value={contact.xUrl}
                      onChangeText={(value) =>
                        changeContact(contact.id, 'xUrl', value)
                      }
                      autoCapitalize="none"
                      autoCorrect={false}
                      inputMode="url"
                      keyboardType="url"
                    />
                    {[0, 1, 2].map((index) => (
                      <FormTextInput
                        key={index}
                        label={`Website ${index + 1}`}
                        helper={
                          index === 0
                            ? 'Optional. Add up to three complete website links.'
                            : undefined
                        }
                        value={contact.websiteUrls[index] ?? ''}
                        onChangeText={(value) =>
                          changeWebsite(contact.id, index, value)
                        }
                        autoCapitalize="none"
                        autoCorrect={false}
                        inputMode="url"
                        keyboardType="url"
                      />
                    ))}
                  </View>
                </Card>
              ) : (
                <View key={contact.id} style={{ gap: theme.spacing.xxs }}>
                  <Button
                    label={contact.email}
                    icon="mail-outline"
                    variant="tertiary"
                    size="small"
                    style={{ alignSelf: 'flex-start' }}
                    onPress={() =>
                      void Linking.openURL(`mailto:${contact.email}`)
                    }
                  />
                  {contact.instagramUrl ||
                  contact.xUrl ||
                  contact.websiteUrls.length > 0 ? (
                    <View style={{ gap: theme.spacing.xxs }}>
                      {contact.instagramUrl ? (
                        <Button
                          label="Instagram"
                          icon="logo-instagram"
                          variant="tertiary"
                          size="small"
                          style={{ alignSelf: 'flex-start' }}
                          onPress={() =>
                            void Linking.openURL(contact.instagramUrl)
                          }
                        />
                      ) : null}
                      {contact.xUrl ? (
                        <Button
                          label="X"
                          icon="at-outline"
                          variant="tertiary"
                          size="small"
                          style={{ alignSelf: 'flex-start' }}
                          onPress={() => void Linking.openURL(contact.xUrl)}
                        />
                      ) : null}
                      {contact.websiteUrls.map((websiteUrl, index) => (
                        <Button
                          key={`${websiteUrl}-${index}`}
                          label={websiteLabel(websiteUrl, index)}
                          icon="globe-outline"
                          variant="tertiary"
                          size="small"
                          style={{ alignSelf: 'flex-start' }}
                          onPress={() => void Linking.openURL(websiteUrl)}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>
              ),
            )
          )}
        </View>

        <LegalLinks returnTo="/settings" />
      </View>

      {hasMoreActions ? (
        <BottomSheet
          visible={moreActionsOpen}
          closeLabel="Close more actions"
          onClose={() => setMoreActionsOpen(false)}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing.sm,
            }}
          >
            <AppText variant="section">More actions</AppText>
            <IconButton
              accessibilityLabel="Close more actions"
              icon="close"
              onPress={() => setMoreActionsOpen(false)}
            />
          </View>
          <ScrollView
            style={{ flexShrink: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.spacing.sm }}
          >
            {hasOfficerTools ? (
              <AppText variant="caption" color="muted">
                OFFICER TOOLS
              </AppText>
            ) : null}
            {canManageCatalogTags ? (
              <ListRow
                title="Manage Catalog Tags"
                subtitle="Create and organize profile tags"
                icon="pricetags-outline"
                onPress={() => {
                  setMoreActionsOpen(false);
                  router.push('/settings/catalog-tags' as never);
                }}
              />
            ) : null}
            {canManageUsers ? (
              <ListRow
                title="Manage Users"
                subtitle="Review roles and remove accounts"
                icon="people-outline"
                onPress={() => {
                  setMoreActionsOpen(false);
                  router.push('/settings/members');
                }}
              />
            ) : null}
            {canManageMembershipApplications ? (
              <ListRow
                title="Manage Whitelist"
                subtitle="Review membership applications"
                icon="clipboard-outline"
                onPress={() => {
                  setMoreActionsOpen(false);
                  router.push('/settings/whitelist');
                }}
              />
            ) : null}
            {canManageInaturalist ? (
              <ListRow
                title="iNaturalist Sync"
                subtitle="Review imports and synchronization"
                icon="leaf-outline"
                onPress={() => {
                  setMoreActionsOpen(false);
                  router.push('/settings/integrations/inaturalist');
                }}
              />
            ) : null}
            {hasPresidentTools ? (
              <AppText variant="caption" color="muted">
                PRESIDENT TOOLS
              </AppText>
            ) : null}
            {canManageBilling ? (
              <ListRow
                title="Club Billing"
                subtitle="Manage invoices and subscription"
                icon="card-outline"
                onPress={() => {
                  setMoreActionsOpen(false);
                  router.push('/settings/club-billing' as never);
                }}
              />
            ) : null}
            {canManageSettings ? (
              <ListRow
                title="Club Settings"
                subtitle="Change club branding and contributor privacy"
                icon="color-palette-outline"
                onPress={() => {
                  setMoreActionsOpen(false);
                  router.push('/settings/app-settings' as never);
                }}
              />
            ) : null}
            {canViewInfrastructureCosts ? (
              <>
                <AppText variant="caption" color="muted">
                  PLATFORM ADMINISTRATION
                </AppText>
                <ListRow
                  title="Infrastructure Costs"
                  subtitle={appModules.billing.presentation.settingsSubtitle}
                  icon="cloud-outline"
                  onPress={() => {
                    setMoreActionsOpen(false);
                    router.push('/settings/billing');
                  }}
                />
              </>
            ) : null}
          </ScrollView>
        </BottomSheet>
      ) : null}
    </Screen>
  );
};

export default Settings;
