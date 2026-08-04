import React from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';

import { AppTheme, useAppTheme } from '../../theme';

export type AppTextVariant = keyof AppTheme['typography'];

interface AppTextProps extends TextProps {
  readonly variant?: AppTextVariant;
  readonly color?: 'default' | 'muted' | 'primary' | 'danger';
  readonly style?: StyleProp<TextStyle>;
}

export const AppText = ({
  variant = 'body',
  color = 'default',
  style,
  ...props
}: AppTextProps) => {
  const theme = useAppTheme();
  const textColor = {
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    primary: theme.colors.primary,
    danger: theme.colors.danger,
  }[color];
  return (
    <Text
      maxFontSizeMultiplier={2}
      {...props}
      style={[theme.typography[variant], { color: textColor }, style]}
    />
  );
};
