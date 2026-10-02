import { ViewStyle } from 'react-native';
import type { AppTheme } from './tokens';

export type CardSurface = 'solid' | 'glass';

// Change this to 'glass' to switch every shared card back to glass.
export const CARD_SURFACE: CardSurface = 'solid';

export const cardAppearanceStyle = (
  theme: AppTheme,
  surface: CardSurface,
  elevated: boolean,
): ViewStyle => ({
  backgroundColor:
    surface === 'solid'
      ? theme.dark
        ? theme.colors.surfaceSubtle
        : theme.colors.surface
      : 'transparent',
  borderWidth: 0,
  // Box shadows work with rounded, clipped content on the app's New Architecture.
  boxShadow: elevated
    ? `0 1px 2px ${theme.colors.shadow}06, 0 2px 7px ${theme.colors.shadow}0C`
    : undefined,
});

// Fill the entire screen gutter so the scroll clipping boundary is outside the
// cards and their shadows. Matching content padding preserves the card widths.
export const CARD_SHADOW_GUTTER = 12;
export const cardListViewportStyle = (theme: AppTheme): ViewStyle => ({
  marginHorizontal: -theme.layout.screenGutter,
});
export const cardListContentStyle = (theme: AppTheme): ViewStyle => ({
  paddingHorizontal: theme.layout.screenGutter,
  paddingTop: CARD_SHADOW_GUTTER,
});
