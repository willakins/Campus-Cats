import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AchievementDefinition } from '@/core/domain/achievements';
import { AppText, Card, StatusPill } from '@/presentation/ui';
import { focusRingStyle } from '@/presentation/ui/focus';
import { useAppTheme } from '@/theme';

export const ProfileCard = ({
  title,
  children,
}: {
  readonly title?: string;
  readonly children: React.ReactNode;
}) => {
  const theme = useAppTheme();
  return (
    <Card style={{ gap: theme.spacing.sm }}>
      {title ? <AppText variant="section">{title}</AppText> : null}
      {children}
    </Card>
  );
};

export const ProfileAchievementRow = ({
  achievement,
  unlocked,
  selected,
  busy,
  disabled,
  onPress,
}: {
  readonly achievement: AchievementDefinition;
  readonly unlocked: boolean;
  readonly selected: boolean;
  readonly busy: boolean;
  readonly disabled: boolean;
  readonly onPress?: () => void;
}) => {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);
  const content = (
    <>
      {busy ? (
        <ActivityIndicator color={theme.colors.primary} size="small" />
      ) : (
        <Ionicons
          name={unlocked ? 'checkmark-circle' : 'lock-closed-outline'}
          size={24}
          color={unlocked ? theme.colors.gold : theme.colors.textMuted}
        />
      )}
      <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.xxs }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: theme.spacing.xs,
          }}
        >
          <AppText variant="label" style={{ flexGrow: 1, flexShrink: 1 }}>
            {achievement.name}
          </AppText>
          <StatusPill
            label={unlocked ? achievement.title : 'Locked'}
            tone={selected ? 'success' : unlocked ? 'primary' : 'neutral'}
          />
        </View>
        <AppText variant="caption" color="muted">
          {achievement.description}
        </AppText>
      </View>
    </>
  );
  const rowStyle = {
    minHeight: theme.layout.minTouchTarget,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.sm,
  };
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        selected ? 'Remove displayed title' : `Display “${achievement.title}”`
      }
      accessibilityHint={`${achievement.name}. ${achievement.description}`}
      accessibilityState={{ selected, disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        rowStyle,
        { opacity: pressed || disabled ? 0.6 : 1 },
        focusRingStyle(focused, theme.colors.info),
      ]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={rowStyle}>{content}</View>
  );
};
