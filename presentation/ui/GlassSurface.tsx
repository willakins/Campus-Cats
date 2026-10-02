import React from 'react';
import { Platform, StyleSheet, View, ViewProps } from 'react-native';

import { BlurView } from 'expo-blur';
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';

import { useAppTheme } from '@/theme';

interface GlassSurfaceProps extends ViewProps {
  readonly variant?: 'floating' | 'card';
}

export const GlassSurface = ({
  children,
  style,
  variant = 'floating',
  ...props
}: GlassSurfaceProps) => {
  const theme = useAppTheme();
  const isCard = variant === 'card';
  const supportsNativeGlass =
    Platform.OS === 'ios' &&
    isGlassEffectAPIAvailable() &&
    isLiquidGlassAvailable();

  // Android has no blur target here; retain enough tint for readable controls.
  const surfaceOpacity = isCard
    ? 'A8'
    : Platform.OS === 'android'
      ? 'CC'
      : '58';

  return (
    <View
      {...props}
      style={[
        {
          overflow: 'hidden',
          borderRadius: isCard ? theme.radii.card : theme.radii.sheet,
          borderWidth: isCard ? 0 : StyleSheet.hairlineWidth,
          borderColor: theme.colors.glassBorder,
        },
        style,
      ]}
    >
      {supportsNativeGlass ? (
        <GlassView
          colorScheme={theme.dark ? 'dark' : 'light'}
          glassEffectStyle="regular"
          isInteractive
          tintColor={`${theme.colors.primary}0A`}
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
        />
      ) : (
        <>
          <BlurView
            blurMethod={Platform.OS === 'android' ? 'none' : undefined}
            intensity={isCard ? 64 : 48}
            tint={
              theme.dark
                ? 'systemUltraThinMaterialDark'
                : 'systemUltraThinMaterialLight'
            }
            style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: `${theme.colors.surface}${surfaceOpacity}`,
                pointerEvents: 'none',
              },
            ]}
          />
        </>
      )}
      <View
        style={{
          position: 'absolute',
          top: 0,
          start: theme.spacing.sm,
          end: theme.spacing.sm,
          height: StyleSheet.hairlineWidth,
          backgroundColor: theme.colors.glassHighlight,
          pointerEvents: 'none',
        }}
      />
      {children}
    </View>
  );
};
