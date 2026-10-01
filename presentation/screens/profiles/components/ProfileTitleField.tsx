import React, { useState } from 'react';
import { View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  Dialog,
  IconButton,
  StatusPill,
} from '@/presentation/ui';
import { ACHIEVEMENTS, AchievementId, achievementById } from '@/core/domain';
import { useAppTheme } from '@/theme';

interface ProfileTitleFieldProps {
  readonly value: AchievementId | '';
  readonly unlockedIds: readonly AchievementId[];
  readonly onChange: (achievementId: AchievementId | '') => void;
}

export const ProfileTitleField = ({
  value,
  unlockedIds,
  onChange,
}: ProfileTitleFieldProps) => {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  const selected = achievementById(value);
  const unlocked = ACHIEVEMENTS.filter(({ id }) => unlockedIds.includes(id));

  return (
    <>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ gap: theme.spacing.xxs }}>
          <AppText variant="label">Displayed title</AppText>
          {selected ? (
            <StatusPill
              label={selected.title}
              tone="success"
              icon="ribbon"
              style={{ alignSelf: 'flex-start' }}
            />
          ) : (
            <View style={{ gap: theme.spacing.xxs }}>
              <AppText color="danger">No title equipped.</AppText>
              {unlocked.length === 0 ? (
                <AppText variant="caption" color="muted">
                  Unlock achievements to earn titles for your profile.
                </AppText>
              ) : null}
            </View>
          )}
        </View>
        <Button
          label={unlocked.length > 0 ? 'Change title' : 'View title progress'}
          icon="ribbon-outline"
          variant="secondary"
          onPress={() => setOpen(true)}
        />
      </View>

      <Dialog
        visible={open}
        closeLabel="Dismiss title collection"
        onClose={() => setOpen(false)}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: theme.spacing.sm,
          }}
        >
          <View style={{ flex: 1, gap: theme.spacing.xxs }}>
            <AppText variant="section">Title collection</AppText>
            <AppText variant="label" color="primary">
              Collect them all
            </AppText>
          </View>
          <IconButton
            icon="close"
            accessibilityLabel="Close title collection"
            onPress={() => setOpen(false)}
          />
        </View>
        <AppText color="muted">
          Every achievement unlocks a title you can wear on your profile. Pick
          an unlocked favorite—or see what to chase next.
        </AppText>
        <StatusPill
          label={`${unlocked.length} / ${ACHIEVEMENTS.length} collected`}
          tone={unlocked.length > 0 ? 'primary' : 'neutral'}
          icon="trophy"
        />
        {ACHIEVEMENTS.map((achievement) => {
          const isUnlocked = unlockedIds.includes(achievement.id);
          const equipped = achievement.id === value;
          return (
            <Card
              key={achievement.id}
              accent={
                equipped
                  ? theme.colors.gold
                  : isUnlocked
                    ? theme.colors.primary
                    : theme.colors.border
              }
              elevated={isUnlocked}
            >
              <View style={{ gap: theme.spacing.sm }}>
                <View style={{ gap: theme.spacing.xxs }}>
                  <AppText variant="cardTitle">{achievement.title}</AppText>
                  <StatusPill
                    label={
                      equipped ? 'Equipped' : isUnlocked ? 'Unlocked' : 'Locked'
                    }
                    tone={
                      equipped ? 'success' : isUnlocked ? 'primary' : 'neutral'
                    }
                    icon={
                      equipped
                        ? 'checkmark-circle'
                        : isUnlocked
                          ? 'ribbon'
                          : 'lock-closed'
                    }
                    style={{ alignSelf: 'flex-start' }}
                  />
                  <AppText variant="label">{achievement.name}</AppText>
                  <AppText color="muted">{achievement.description}</AppText>
                </View>
                {isUnlocked ? (
                  <Button
                    label={
                      equipped ? 'Equipped' : `Equip “${achievement.title}”`
                    }
                    size="small"
                    variant={equipped ? 'secondary' : 'primary'}
                    disabled={equipped}
                    onPress={() => {
                      onChange(achievement.id);
                      setOpen(false);
                    }}
                  />
                ) : null}
              </View>
            </Card>
          );
        })}
        {value ? (
          <Button
            label="Remove displayed title"
            variant="tertiary"
            onPress={() => {
              onChange('');
              setOpen(false);
            }}
          />
        ) : null}
      </Dialog>
    </>
  );
};
