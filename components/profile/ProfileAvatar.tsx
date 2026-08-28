import React from 'react';
import { View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../../theme';
import { AppText } from '../design';
import { ProgressiveImage } from '../ui/ProgressiveImage';

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
  const colors = tone === 'primary'
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
          style={{ color: colors[1], fontSize: Math.max(12, Math.round(size * 0.4)) }}
        >
          {displayName.trim().charAt(0).toLocaleUpperCase() || '?'}
        </AppText>
      ) : (
        <Ionicons
          name="person"
          size={Math.round(size * 0.52)}
          color={colors[1]}
        />
      )}
    </View>
  );
};
