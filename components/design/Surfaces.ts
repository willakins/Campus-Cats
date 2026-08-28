import { StyleProp, ViewStyle } from 'react-native';

import { AppTheme } from '../../theme';

interface CardSurfaceOptions {
  readonly accent?: string;
  readonly clipsContent?: boolean;
  readonly elevated?: boolean;
  readonly padded?: boolean;
}

export const cardContentStyle = (theme: AppTheme): ViewStyle => ({
  gap: theme.spacing.xs,
  padding: theme.spacing.md,
});

export const cardSurfaceStyle = (
  theme: AppTheme,
  {
    accent,
    clipsContent = true,
    elevated = true,
    padded = true,
  }: CardSurfaceOptions = {},
): StyleProp<ViewStyle> => [
  elevated ? theme.elevation.card : undefined,
  {
    overflow: clipsContent ? 'hidden' : 'visible',
    padding: padded ? cardContentStyle(theme).padding : 0,
    borderRadius: theme.radii.card,
    borderLeftWidth: accent ? 5 : undefined,
    borderLeftColor: accent,
    backgroundColor: theme.colors.surface,
  },
];
