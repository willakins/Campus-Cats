import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useAppTheme, useReducedMotion } from '../../theme';
import { focusRingStyle } from './focus';
import { AppText } from './Typography';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
type ButtonSize = 'small' | 'medium';

export interface ButtonProps
  extends Omit<PressableProps, 'children' | 'style'> {
  readonly label: string;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly icon?: IconName;
  readonly loading?: boolean;
  readonly loadingLabel?: string;
  readonly fullWidth?: boolean;
  readonly style?: StyleProp<ViewStyle>;
  readonly textStyle?: StyleProp<TextStyle>;
}

export const Button = ({
  label,
  variant = 'primary',
  size = 'medium',
  icon,
  loading = false,
  loadingLabel = 'Working…',
  fullWidth = false,
  disabled,
  style,
  textStyle,
  onFocus,
  onBlur,
  ...props
}: ButtonProps) => {
  const theme = useAppTheme();
  const reducedMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const isDisabled = disabled || loading;
  const palette = {
    primary: {
      background: theme.colors.primary,
      foreground: theme.colors.onPrimary,
      border: theme.colors.primary,
    },
    secondary: {
      background: theme.colors.surface,
      foreground: theme.colors.text,
      border: theme.colors.border,
    },
    tertiary: {
      background: 'transparent',
      foreground: theme.colors.primary,
      border: 'transparent',
    },
    danger: {
      background: theme.colors.danger,
      foreground: theme.dark ? theme.colors.background : theme.colors.surface,
      border: theme.colors.danger,
    },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      {...props}
      style={({ pressed }) => [
        {
          minHeight: theme.layout.minTouchTarget,
          minWidth: theme.layout.minTouchTarget,
          width: fullWidth ? '100%' : undefined,
          paddingHorizontal: size === 'small' ? theme.spacing.sm : theme.spacing.lg,
          paddingVertical: size === 'small' ? theme.spacing.xs : theme.spacing.sm,
          borderRadius: theme.radii.pill,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.background,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: theme.spacing.xs,
          opacity: isDisabled ? 0.55 : pressed ? 0.82 : 1,
          transform: reducedMotion
            ? undefined
            : [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        },
        focusRingStyle(focused, theme.colors.info),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.foreground} />
      ) : icon ? (
        <Ionicons name={icon} size={size === 'small' ? 18 : 20} color={palette.foreground} />
      ) : null}
      <AppText
        variant="label"
        style={[{ color: palette.foreground, textAlign: 'center' }, textStyle]}
      >
        {loading ? loadingLabel : label}
      </AppText>
    </Pressable>
  );
};

interface IconButtonProps
  extends Omit<PressableProps, 'children' | 'style'> {
  readonly icon: IconName;
  readonly accessibilityLabel: string;
  readonly variant?: 'surface' | 'primary' | 'danger';
  readonly style?: StyleProp<ViewStyle>;
}

export const IconButton = ({
  icon,
  accessibilityLabel,
  variant = 'surface',
  style,
  disabled,
  onFocus,
  onBlur,
  ...props
}: IconButtonProps) => {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);
  const palette = {
    surface: [theme.colors.surface, theme.colors.text, theme.colors.border],
    primary: [theme.colors.primary, theme.colors.onPrimary, theme.colors.primary],
    danger: [theme.colors.dangerSurface, theme.colors.danger, theme.colors.danger],
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      {...props}
      style={({ pressed }) => [
        {
          width: theme.layout.minTouchTarget,
          height: theme.layout.minTouchTarget,
          borderRadius: theme.radii.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette[0],
          borderWidth: 1,
          borderColor: palette[2],
          opacity: disabled ? 0.55 : pressed ? 0.8 : 1,
        },
        focusRingStyle(focused, theme.colors.info),
        style,
      ]}
    >
      <Ionicons name={icon} size={22} color={palette[1]} />
    </Pressable>
  );
};
