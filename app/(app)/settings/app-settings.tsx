import { useCallback, useState } from 'react';
import { Image, View } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';

import {
  AccessDeniedState,
  AppHeader,
  AppText,
  Button,
  Card,
  CardListSkeleton,
  ErrorState,
  FeedbackBanner,
  FormSection,
  Screen,
} from '@/components/design';
import { FormTextInput, ToggleField } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import {
  AppSettings,
  DEFAULT_APP_SETTINGS,
  canManageAppSettings,
  parseUser,
} from '@/core/domain';
import { useAppSettings } from '@/providers/AppSettingsProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useAppTheme } from '@/theme';

const AppSettingsScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const actor = parseUser(useAuth().user);
  const authorized = canManageAppSettings(actor.role);
  const { applySettings } = useAppSettings();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [logoLocalUri, setLogoLocalUri] = useState<string>();
  const [loading, setLoading] = useState(authorized);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

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
      setSaved(false);
    } else if (!result.ok) setError(result.error.message);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    setError(undefined);
    const result = await appModules.appSettings.save(
      actor,
      settings,
      logoLocalUri,
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setSettings(result.value);
    setLogoLocalUri(undefined);
    setSaved(true);
    applySettings(result.value);
  };

  const logoSource = logoLocalUri
    ? { uri: logoLocalUri }
    : settings.logoUrl
      ? { uri: settings.logoUrl }
      : require('../../../assets/images/campus_cats_logo.png');
  const primaryPreview = /^#[0-9A-Fa-f]{6}$/.test(settings.primaryColor)
    ? settings.primaryColor
    : theme.colors.surface;
  const accentPreview = /^#[0-9A-Fa-f]{6}$/.test(settings.accentColor)
    ? settings.accentColor
    : theme.colors.surface;

  return (
    <Screen scroll keyboardAware>
      <AppHeader
        title="App settings"
        eyebrow="President tools"
        onBack={() => router.back()}
      />
      {!authorized ? (
        <AccessDeniedState message="Only the President may manage app settings." />
      ) : loading ? (
        <CardListSkeleton label="Loading app settings" layout="actions" />
      ) : error && !hasLoaded ? (
        <ErrorState title="App settings unavailable" message={error} onRetry={load} />
      ) : (
        <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xl }}>
          {error ? <FeedbackBanner tone="danger" message={error} /> : null}
          {saved ? <FeedbackBanner tone="success" message="App settings saved." /> : null}

          <FormSection title="Club logo">
            <Card accent={theme.colors.gold}>
              <Image
                accessibilityLabel="Current club logo"
                resizeMode="contain"
                source={logoSource}
                style={{ width: '100%', height: 160 }}
              />
            </Card>
            <Button
              label="Choose New Logo"
              icon="images-outline"
              variant="secondary"
              disabled={saving}
              onPress={() => void chooseLogo()}
            />
            <AppText color="muted" variant="caption">
              The selected image appears on all account-access screens, including sign in.
            </AppText>
          </FormSection>

          <FormSection title="App colors">
            <FormTextInput
              label="Primary color"
              helper="Six-digit hex color, for example 18314F prefixed by #"
              value={settings.primaryColor}
              autoCapitalize="characters"
              onChangeText={(primaryColor) => {
                setSaved(false);
                setSettings((current) => ({ ...current, primaryColor }));
              }}
            />
            <FormTextInput
              label="Accent color"
              helper="Six-digit hex color, for example B58A16 prefixed by #"
              value={settings.accentColor}
              autoCapitalize="characters"
              onChangeText={(accentColor) => {
                setSaved(false);
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
                setSaved(false);
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
    </Screen>
  );
};

export default AppSettingsScreen;
