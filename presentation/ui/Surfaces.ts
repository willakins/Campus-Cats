import { StyleProp, ViewStyle } from 'react-native';

import {
  AppTheme,
  CardSurface,
  CARD_SURFACE,
  cardAppearanceStyle,
} from '@/theme';

interface CardSurfaceOptions {
  readonly clipsContent?: boolean;
  readonly surface?: CardSurface;
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
    clipsContent = true,
    surface = CARD_SURFACE,
    elevated = true,
    padded = true,
  }: CardSurfaceOptions = {},
): StyleProp<ViewStyle> => [
  cardAppearanceStyle(theme, surface, elevated),
  {
    overflow: clipsContent ? 'hidden' : 'visible',
    padding: padded ? cardContentStyle(theme).padding : 0,
    borderRadius: theme.radii.card,
  },
];
