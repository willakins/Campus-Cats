import React from 'react';
import { Pressable, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  PublicProfile,
  achievementById,
  defaultDisplayNameFromEmail,
} from '../../core/domain';
import { useAppTheme } from '../../theme';
import { AppText, StatusPill } from '../design';
import { ProfileAvatar } from './ProfileAvatar';

export const MemberIdentity = ({
  profile,
  fallbackEmail,
  onPress,
}: {
  readonly profile?: PublicProfile;
  readonly fallbackEmail: string;
  readonly onPress: () => void;
}) => {
  const theme = useAppTheme();
  const displayName =
    profile?.displayName || defaultDisplayNameFromEmail(fallbackEmail);
  const title = profile
    ? achievementById(profile.selectedTitleId)?.title
    : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${displayName}'s profile`}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: theme.layout.minTouchTarget,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <ProfileAvatar
        displayName={displayName}
        photoUrl={profile?.profilePhotoUrl}
        size={56}
      />
      <View style={{ flex: 1, gap: theme.spacing.xxs }}>
        <AppText variant="cardTitle">{displayName}</AppText>
        {title ? <StatusPill label={title} tone="primary" icon="ribbon" /> : null}
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={theme.colors.textMuted}
      />
    </Pressable>
  );
};
