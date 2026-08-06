import React from 'react';
import {
  Image,
  TextInput as NativeTextInput,
  TextInputProps as NativeTextInputProps,
  View,
} from 'react-native';

import { useAppTheme } from '../../theme';
import { useAppSettings } from '../../providers/AppSettingsProvider';
import { AppHeader, AppText, Card, FormField, Screen } from '../design';

interface AuthScaffoldProps {
  readonly title: string;
  readonly subtitle: string;
  readonly onBack?: () => void;
  readonly children: React.ReactNode;
}

export const AuthScaffold = ({ title, subtitle, onBack, children }: AuthScaffoldProps) => {
  const theme = useAppTheme();
  const { settings } = useAppSettings();
  return (
    <Screen scroll keyboardAware contentStyle={{ paddingBottom: theme.spacing.huge }}>
      {onBack ? <AppHeader title={title} eyebrow="Account access" onBack={onBack} /> : null}
      <View
        style={{
          width: '100%',
          maxWidth: theme.layout.maxAuthWidth,
          alignSelf: 'center',
          gap: theme.spacing.lg,
          paddingTop: onBack ? 0 : theme.spacing.xl,
        }}
      >
        <View
          style={{
            alignItems: 'center',
            gap: theme.spacing.sm,
            padding: theme.spacing.lg,
            borderRadius: theme.radii.sheet,
            backgroundColor: theme.colors.goldSurface,
          }}
        >
          <Image
            accessibilityLabel="Campus Cats logo"
            resizeMode="contain"
            source={
              settings.logoUrl
                ? { uri: settings.logoUrl }
                : require('../../assets/images/campus_cats_logo.png')
            }
            style={{ width: '100%', height: 152 }}
          />
          {!onBack ? (
            <AppText variant="display" style={{ textAlign: 'center' }}>
              {title}
            </AppText>
          ) : null}
          <AppText color="muted" style={{ textAlign: 'center' }}>
            {subtitle}
          </AppText>
        </View>
        <Card style={{ gap: theme.spacing.md }}>{children}</Card>
      </View>
    </Screen>
  );
};

interface AuthTextFieldProps extends NativeTextInputProps {
  readonly label: string;
  readonly required?: boolean;
  readonly helper?: string;
  readonly error?: string;
}

export const AuthTextField = ({
  label,
  required,
  helper,
  error,
  style,
  ...props
}: AuthTextFieldProps) => {
  const theme = useAppTheme();
  return (
    <FormField label={label} required={required} helper={helper} error={error}>
      {({ inputId, describedBy }) => (
        <NativeTextInput
          accessibilityLabel={label}
          accessibilityHint={describedBy}
          nativeID={inputId}
          maxFontSizeMultiplier={2}
          placeholderTextColor={theme.colors.textMuted}
          selectionColor={theme.colors.primary}
          style={[
            theme.typography.body,
            {
              minHeight: theme.layout.minTouchTarget,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xs,
              borderWidth: 1,
              borderColor: error ? theme.colors.danger : theme.colors.border,
              borderRadius: theme.radii.field,
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
            },
            style,
          ]}
          {...props}
        />
      )}
    </FormField>
  );
};
