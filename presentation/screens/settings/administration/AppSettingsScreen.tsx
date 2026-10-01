import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { useRouter } from 'expo-router';

import {
  AppText,
  Button,
  Card,
  CardListSkeleton,
  ErrorState,
  FeedbackBanner,
  FormSection,
} from '@/presentation/ui';
import { RestrictedScreen } from '@/presentation/access';
import { useFocusTask } from '@/presentation/hooks/useFocusTask';
import { AppLogo, resolveAppLogoSource } from '@/presentation/branding';
import { HexColorPicker, ToggleField } from '@/presentation/forms';
import { appModules } from '@/composition/appModules';
import {
  AppSettings,
  DEFAULT_APP_SETTINGS,
  canAccessRolePolicy,
  parseUser,
  roleAccessPolicies,
} from '@/core/domain';
import { useAppSettings } from '@/presentation/providers/AppSettingsProvider';
import { useAuth } from '@/presentation/providers/AuthProvider';
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

  const load = useCallback((isActive: () => boolean = () => true) => {
    if (!authorized) return;
    setLoading(true);
    setError(undefined);
    void appModules.appSettings.get().then((result) => {
      if (!isActive()) return;
      setLoading(false);
      if (result.ok) {
        setSettings(result.value);
        setHasLoaded(true);
      }
      else setError(result.error.message);
    });
  }, [authorized]);

  useFocusTask(load);

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
    await persistSettings(logoLocalUri, 'Club settings saved.');
  };

  const logoSource = logoLocalUri
    ? { uri: logoLocalUri }
    : resolveAppLogoSource(settings.logoUrl);
  return (
    <RestrictedScreen
      scroll
      keyboardAware
      title="Club settings"
      eyebrow="President tools"
      onBack={() => router.back()}
      access={{ policy: roleAccessPolicies.manageAppSettings, role: actor.role }}
    >
      {loading ? (
        <CardListSkeleton label="Loading club settings" layout="actions" />
      ) : error && !hasLoaded ? (
        <ErrorState title="Club settings unavailable" message={error} onRetry={load} />
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
            <Button
              label="Change Club Logo"
              icon="images-outline"
              variant="secondary"
              disabled={saving}
              onPress={() => void chooseLogo()}
            />
            <AppText color="muted" variant="caption">
              Choose an image that represents your club. It will appear on
              account-access screens and primary headers.
            </AppText>
          </FormSection>

          <FormSection title="Club colors">
            <HexColorPicker
              label="Primary color"
              value={settings.primaryColor}
              onChange={(primaryColor) => {
                setSuccessMessage(undefined);
                setSettings((current) => ({ ...current, primaryColor }));
              }}
            />
            <HexColorPicker
              label="Accent color"
              value={settings.accentColor}
              onChange={(accentColor) => {
                setSuccessMessage(undefined);
                setSettings((current) => ({ ...current, accentColor }));
              }}
            />
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
            label="Save Club Settings"
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
