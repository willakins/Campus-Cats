import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import {
  AppText,
  Button,
  Card,
  CardListSkeleton,
  ErrorState,
  FeedbackBanner,
  FormSection,
} from '@/components/design';
import { RestrictedScreen } from '@/components/access';
import { AppLogo, resolveAppLogoSource } from '@/components/branding';
import { FormTextInput, ToggleField } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import {
  AppSettings,
  DEFAULT_APP_SETTINGS,
  canAccessRolePolicy,
  parseUser,
  roleAccessPolicies,
} from '@/core/domain';
import { loadBundledClubLogoUri } from '@/features/appSettings/bundledBranding';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useAppTheme } from '@/theme';

const AppSettingsScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const actor = parseUser(useAuth().user);
  const authorized = canAccessRolePolicy(
    actor.role,
    roleAccessPolicies.manageAppSettings,
  );
  const { applySettings } = useAppSettings();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [logoLocalUri, setLogoLocalUri] = useState<string>();
  const [loading, setLoading] = useState(authorized);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();

  const load = useCallback(() => {
    if (!authorized) return;
    setLoading(true);
    setError(undefined);
    void appModules.appSettings.get().then((result) => {
      setLoading(false);
      if (result.ok) {
        setSettings(result.value);
        setHasLoaded(true);
      }
      else setError(result.error.message);
    });
  }, [authorized]);

  useFocusEffect(load);

  const chooseLogo = async () => {
    const result = await appModules.imageSelection.pickFromLibrary();
    if (result.ok && result.value) {
      setLogoLocalUri(result.value.localUri);
      setSuccessMessage(undefined);
    } else if (!result.ok) setError(result.error.message);
  };

  const persistSettings = async (
    uploadUri: string | undefined,
    message: string,
  ) => {
    if (saving) return;
    setSaving(true);
    setSuccessMessage(undefined);
    setError(undefined);
    const result = await appModules.appSettings.save(
      actor,
      settings,
      uploadUri,
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setSettings(result.value);
    setLogoLocalUri(undefined);
    setSuccessMessage(message);
    applySettings(result.value);
  };

  const save = async () => {
    await persistSettings(logoLocalUri, 'App settings saved.');
  };

  const publishCurrentClubLogo = async () => {
    if (saving) return;
    setError(undefined);
    try {
      const uri = await loadBundledClubLogoUri();
      await persistSettings(uri, 'Current club logo published.');
    } catch {
      setError('Could not load the current bundled club logo');
    }
  };

  const logoSource = logoLocalUri
    ? { uri: logoLocalUri }
    : resolveAppLogoSource(settings.logoUrl);
  const primaryPreview = /^#[0-9A-Fa-f]{6}$/.test(settings.primaryColor)
    ? settings.primaryColor
    : theme.colors.surface;
  const accentPreview = /^#[0-9A-Fa-f]{6}$/.test(settings.accentColor)
    ? settings.accentColor
    : theme.colors.surface;

  return (
    <RestrictedScreen
      scroll
      keyboardAware
      title="App settings"
      eyebrow="President tools"
      onBack={() => router.back()}
      access={{ policy: roleAccessPolicies.manageAppSettings, role: actor.role }}
    >
      {loading ? (
        <CardListSkeleton label="Loading app settings" layout="actions" />
      ) : error && !hasLoaded ? (
        <ErrorState title="App settings unavailable" message={error} onRetry={load} />
      ) : (
        <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xl }}>
          {error ? <FeedbackBanner tone="danger" message={error} /> : null}
          {successMessage ? <FeedbackBanner tone="success" message={successMessage} /> : null}

          <FormSection title="Club logo">
            <Card accent={theme.colors.gold}>
              <AppLogo
                accessibilityLabel="Current club logo"
                source={logoSource}
                style={{ width: '100%', height: 160 }}
              />
            </Card>
            {!settings.logoUrl && !logoLocalUri ? (
              <>
                <FeedbackBanner message="The previous app icon is ready to move into president-managed club branding." />
                <Button
                  label="Publish Current Club Logo"
                  icon="cloud-upload-outline"
                  variant="secondary"
                  disabled={saving}
                  onPress={() => void publishCurrentClubLogo()}
                />
              </>
            ) : null}
            <Button
              label="Choose New Logo"
              icon="images-outline"
              variant="secondary"
              disabled={saving}
              onPress={() => void chooseLogo()}
            />
            <AppText color="muted" variant="caption">
              The saved logo appears on account-access screens and primary app headers.
            </AppText>
          </FormSection>

          <FormSection title="App colors">
            <FormTextInput
              label="Primary color"
              helper="Six-digit hex color, for example 18314F prefixed by #"
              value={settings.primaryColor}
              autoCapitalize="characters"
              onChangeText={(primaryColor) => {
                setSuccessMessage(undefined);
                setSettings((current) => ({ ...current, primaryColor }));
              }}
            />
            <FormTextInput
              label="Accent color"
              helper="Six-digit hex color, for example B58A16 prefixed by #"
              value={settings.accentColor}
              autoCapitalize="characters"
              onChangeText={(accentColor) => {
                setSuccessMessage(undefined);
                setSettings((current) => ({ ...current, accentColor }));
              }}
            />
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <View
                accessibilityLabel="Primary color preview"
                style={{
                  flex: 1,
                  height: theme.layout.minTouchTarget,
                  borderRadius: theme.radii.field,
                  backgroundColor: primaryPreview,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              />
              <View
                accessibilityLabel="Accent color preview"
                style={{
                  flex: 1,
                  height: theme.layout.minTouchTarget,
                  borderRadius: theme.radii.field,
                  backgroundColor: accentPreview,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              />
            </View>
          </FormSection>

          <FormSection title="Contributor privacy">
            <ToggleField
              label="Keep sightings anonymous"
              value={settings.sightingsAnonymous}
              onValueChange={(sightingsAnonymous) => {
                setSuccessMessage(undefined);
                setSettings((current) => ({ ...current, sightingsAnonymous }));
              }}
            />
            <AppText color="muted">
              When enabled, only officers can see who contributed Campus Cats sightings
              and catalog entries. Contributors can still edit their own sightings.
            </AppText>
          </FormSection>

          <Button
            label="Save App Settings"
            icon="save-outline"
            fullWidth
            loading={saving}
            onPress={() => void save()}
          />
        </View>
      )}
    </RestrictedScreen>
  );
};

export default AppSettingsScreen;
