import React from 'react';
import { Pressable, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../../theme';
import { AppText } from '../design';

interface ChoiceFieldProps {
  readonly label: string;
  readonly accessibilityLabel?: string;
  readonly checked: boolean;
  readonly kind?: 'checkbox' | 'radio';
  readonly helper?: string;
  readonly appearance?: 'plain' | 'outlined';
  readonly disabled?: boolean;
  readonly trailing?: React.ReactNode;
  readonly onChange: (checked: boolean) => void;
}

export const ChoiceField = ({
  label,
  accessibilityLabel,
  checked,
  kind = 'checkbox',
  helper,
  appearance = 'outlined',
  disabled = false,
  trailing,
  onChange,
}: ChoiceFieldProps) => {
  const theme = useAppTheme();
  const outlined = appearance === 'outlined';
  const control = (
    <Pressable
      accessibilityRole={kind}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{
        checked,
        ...(disabled ? { disabled: true } : {}),
      }}
      disabled={disabled || undefined}
      onPress={() => onChange(kind === 'radio' ? true : !checked)}
      style={({ pressed }) => ({
        flex: trailing ? 1 : undefined,
        minHeight: theme.layout.minTouchTarget,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingHorizontal: outlined ? theme.spacing.md : 0,
        paddingVertical: outlined ? theme.spacing.sm : 0,
        borderWidth: outlined ? 1 : 0,
        borderColor: checked ? theme.colors.primary : theme.colors.border,
        borderRadius: outlined ? theme.radii.field : 0,
        backgroundColor: outlined
          ? checked
            ? theme.colors.primarySurface
            : theme.colors.surface
          : 'transparent',
        opacity: disabled ? 0.55 : pressed ? 0.78 : 1,
      })}
    >
      <View
        style={{
          width: 22,
          height: 22,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: kind === 'radio' ? 11 : theme.radii.field / 2,
          borderWidth: kind === 'radio' && checked ? 6 : 2,
          borderColor: checked ? theme.colors.primary : theme.colors.textMuted,
          backgroundColor:
            kind === 'checkbox' && checked
              ? theme.colors.primary
              : 'transparent',
        }}
      >
        {kind === 'checkbox' && checked ? (
          <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />
        ) : null}
      </View>
      <View style={{ flex: 1, gap: theme.spacing.xxs }}>
        <AppText variant="label">{label}</AppText>
        {helper ? (
          <AppText variant="caption" color="muted">
            {helper}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
  return trailing ? (
    <View
      style={{
        minHeight: theme.layout.minTouchTarget,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
      }}
    >
      {control}
      {trailing}
    </View>
  ) : control;
};

export const ChoiceGroup = ({
  children,
  label,
}: {
  readonly children: React.ReactNode;
  readonly label?: string;
}) => {
  const theme = useAppTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{ gap: theme.spacing.sm }}
    >
      {children}
    </View>
  );
};
