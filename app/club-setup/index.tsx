import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AuthTextField } from '@/presentation/auth';
import { FormScreen, HexColorPicker } from '@/presentation/forms';
import {
  AppText,
  Button,
  FormSection,
  SegmentedControl,
  StatusPill,
} from '@/presentation/ui';
import { appModules } from '@/composition/appModules';
import {
  ClubSetupDraft,
  DEFAULT_APP_SETTINGS,
  defaultClubName,
  isHexColor,
} from '@/core/domain';
import { useUniversitySelection } from '@/presentation/providers';
import { createBrandedTheme, useAppTheme } from '@/theme';

const ClubSetupScreen = () => {
  const router = useRouter();
  const theme = useAppTheme();
  const { university } = useUniversitySelection();
  const [draft, setDraft] = useState<ClubSetupDraft>({
    universityId: university?.id ?? '',
    clubName: university ? defaultClubName(university.name) : '',
    primaryColor: DEFAULT_APP_SETTINGS.primaryColor,
    accentColor: DEFAULT_APP_SETTINGS.accentColor,
    presidentChoice: 'self',
    presidentEmail: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!university) return;
    setDraft((current) => ({
      ...current,
      universityId: university.id,
      clubName:
        current.universityId === university.id && current.clubName
          ? current.clubName
          : defaultClubName(university.name),
    }));
  }, [university?.id]);

  const previews = useMemo(() => {
    if (!isHexColor(draft.primaryColor) || !isHexColor(draft.accentColor)) {
      return undefined;
    }
    const colors = {
      primaryColor: draft.primaryColor,
      accentColor: draft.accentColor,
    };
    return {
      light: createBrandedTheme(false, colors),
      dark: createBrandedTheme(true, colors),
    };
  }, [draft.accentColor, draft.primaryColor]);

  if (!university) return <Redirect href={'/university-search' as never} />;
  if (university.status === 'mapped') return <Redirect href="/login" />;
  if (university.status === 'pending') {
    return <Redirect href={'/club-setup/pending' as never} />;
  }

  const update = <Key extends keyof ClubSetupDraft>(
    key: Key,
    value: ClubSetupDraft[Key],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    const result = await appModules.universityOnboarding.requestSetup(draft);
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    router.replace({
      pathname: '/club-setup/pending' as never,
      params: {
        requestId: result.value.requestId,
        maskedEmail: result.value.maskedEmail,
        expiresAt: result.value.expiresAt,
      },
    });
  };

  return (
    <FormScreen
      title="Start a club"
      eyebrow={university.name}
      onBack={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/university-search');
      }}
      saveLabel="Email President for verification"
      savingLabel="Sending verification…"
      busy={busy}
      error={error}
      onSave={() => void submit()}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          padding: theme.spacing.md,
          borderRadius: theme.radii.card,
          backgroundColor: theme.colors.primarySurface,
        }}
      >
        <View
          style={{
            width: theme.layout.minTouchTarget,
            height: theme.layout.minTouchTarget,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.radii.pill,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Ionicons
            name="people-outline"
            size={24}
            color={theme.colors.primary}
          />
        </View>
        <View style={{ flex: 1, gap: theme.spacing.xxs }}>
          <AppText variant="label" color="primary">
            Your club starts here
          </AppText>
          <AppText variant="caption" color="muted">
            Choose a name and colors, then verify your President.
          </AppText>
        </View>
      </View>
      <FormSection title="Club identity">
        <AuthTextField
          label="Club name"
          required
          value={draft.clubName}
          onChangeText={(value) => update('clubName', value)}
        />
      </FormSection>
      <FormSection title="Club colors">
        <AppText color="muted">
          Make it feel like your campus. See how your colors look in both
          themes.
        </AppText>
        <HexColorPicker
          label="Primary color"
          value={draft.primaryColor}
          onChange={(value) => update('primaryColor', value)}
        />
        <HexColorPicker
          label="Accent color"
          value={draft.accentColor}
          onChange={(value) => update('accentColor', value)}
        />
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.sm,
          }}
        >
          {(['light', 'dark'] as const).map((mode) => {
            const preview = previews?.[mode];
            return (
              <View
                key={mode}
                accessibilityLabel={`${mode === 'light' ? 'Light' : 'Dark'} theme preview`}
                style={{
                  flex: 1,
                  minWidth: 140,
                  minHeight: 120,
                  gap: theme.spacing.sm,
                  padding: theme.spacing.sm,
                  borderRadius: theme.radii.field,
                  borderWidth: 1,
                  borderColor: preview?.colors.border ?? theme.colors.border,
                  backgroundColor:
                    preview?.colors.background ?? theme.colors.surface,
                }}
              >
                <AppText
                  variant="label"
                  style={{ color: preview?.colors.text ?? theme.colors.text }}
                >
                  {mode === 'light' ? 'Light' : 'Dark'}
                </AppText>
                <View
                  style={{
                    minHeight: 38,
                    justifyContent: 'center',
                    paddingHorizontal: theme.spacing.sm,
                    borderRadius: theme.radii.field,
                    backgroundColor:
                      preview?.colors.primary ?? theme.colors.surfaceSubtle,
                  }}
                >
                  <AppText
                    variant="label"
                    style={{
                      color: preview?.colors.onPrimary ?? theme.colors.text,
                      textAlign: 'center',
                    }}
                  >
                    Primary
                  </AppText>
                </View>
                <AppText
                  variant="caption"
                  style={{
                    color: preview?.colors.gold ?? theme.colors.textMuted,
                  }}
                >
                  Accent color
                </AppText>
              </View>
            );
          })}
        </View>
      </FormSection>
      <FormSection title="Club President">
        <AppText color="muted">
          We’ll send a verification link to this person’s school email.
        </AppText>
        <SegmentedControl
          label="Who is the President?"
          variant="segment"
          value={draft.presidentChoice}
          options={[
            { value: 'self', label: "I'm the President" },
            { value: 'other', label: 'Someone else' },
          ]}
          onChange={(value) => update('presidentChoice', value)}
        />
        <AuthTextField
          label={
            draft.presidentChoice === 'self'
              ? 'Your school email'
              : "President's school email"
          }
          helper={`Must use ${university.emailDomains.join(' or ') || 'an approved school domain'}`}
          required
          value={draft.presidentEmail}
          autoCapitalize="none"
          autoComplete="email"
          inputMode="email"
          keyboardType="email-address"
          onChangeText={(value) => update('presidentEmail', value)}
        />
      </FormSection>
      <FormSection title="Sign-in methods">
        <View style={{ gap: theme.spacing.xs }}>
          <StatusPill
            label="Email login enabled"
            tone="success"
            icon="mail-outline"
          />
          <AppText color="muted">
            Members will use approved email accounts.
          </AppText>
        </View>
        <Button
          label="Single sign-on · Coming soon"
          icon="school-outline"
          variant="secondary"
          disabled
          onPress={() => undefined}
        />
      </FormSection>
    </FormScreen>
  );
};

export default ClubSetupScreen;
