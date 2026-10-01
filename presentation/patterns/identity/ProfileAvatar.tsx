import React from 'react';
import { View } from 'react-native';

import { useAppTheme } from '@/theme';
import { AppText } from '@/presentation/ui';
import { ProgressiveImage } from '@/presentation/ui/ProgressiveImage';

export const ProfileAvatar = ({
  displayName,
  photoUrl,
  size = 64,
  fallback = 'icon',
  tone = 'violet',
}: {
  readonly displayName: string;
  readonly photoUrl?: string;
  readonly size?: number;
  readonly fallback?: 'icon' | 'initial';
  readonly tone?: 'primary' | 'violet';
}) => {
  const theme = useAppTheme();
  const colors =
    tone === 'primary'
      ? [theme.colors.primarySurface, theme.colors.primary]
      : [theme.colors.violetSurface, theme.colors.violet];
  const style = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };
  return photoUrl ? (
    <ProgressiveImage
      accessibilityLabel={`${displayName}'s profile picture`}
      uri={photoUrl}
      resizeMode="cover"
      style={style}
    />
  ) : (
    <View
      testID="profile-avatar-placeholder"
      accessibilityLabel={`${displayName} has no profile picture`}
      style={{
        ...style,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors[0],
      }}
    >
      {fallback === 'initial' ? (
        <AppText
          variant="label"
          style={{
            color: colors[1],
            fontSize: Math.max(12, Math.round(size * 0.4)),
          }}
        >
          {displayName.trim().charAt(0).toLocaleUpperCase() || '?'}
        </AppText>
      ) : (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ alignItems: 'center', gap: Math.max(2, size * 0.04) }}
        >
          <View
            testID="profile-avatar-placeholder-head"
            style={{
              width: size * 0.24,
              height: size * 0.24,
              borderRadius: size * 0.12,
              backgroundColor: colors[1],
            }}
          />
          <View
            testID="profile-avatar-placeholder-body"
            style={{
              width: size * 0.56,
              height: size * 0.27,
              borderTopLeftRadius: size * 0.28,
              borderTopRightRadius: size * 0.28,
              borderBottomLeftRadius: size * 0.06,
              borderBottomRightRadius: size * 0.06,
              backgroundColor: colors[1],
            }}
          />
        </View>
      )}
    </View>
  );
};
