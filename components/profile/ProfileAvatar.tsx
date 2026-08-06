import React from 'react';
import { View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../../theme';
import { ProgressiveImage } from '../ui/ProgressiveImage';

export const ProfileAvatar = ({
  displayName,
  photoUrl,
  size = 64,
}: {
  readonly displayName: string;
  readonly photoUrl?: string;
  readonly size?: number;
}) => {
  const theme = useAppTheme();
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
        backgroundColor: theme.colors.violetSurface,
      }}
    >
      <Ionicons
        name="person"
        size={Math.round(size * 0.52)}
        color={theme.colors.violet}
      />
    </View>
  );
};
