import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useAppTheme } from '../../theme';
import { AppText, Button, Card } from '../design';
import { focusRingStyle } from '../design/focus';
import { ProgressiveImage } from '../ui/ProgressiveImage';

export interface VotingChoiceCardValue {
  readonly id: string;
  readonly label: string;
  readonly imageUrl?: string;
  readonly pitch?: string;
  readonly profileUserId?: string;
}

export const CommunityVotingChoiceCard = ({
  choice,
  selected,
  onProfilePress,
  onSelect,
}: {
  readonly choice: VotingChoiceCardValue;
  readonly selected: boolean;
  readonly onProfilePress: (userId: string) => void;
  readonly onSelect: (choiceId: string) => void;
}) => {
  const theme = useAppTheme();
  const profileUserId = choice.profileUserId;
  const [profileFocused, setProfileFocused] = useState(false);
  const candidateDetails = (
    <>
      {choice.imageUrl ? (
        <ProgressiveImage
          uri={choice.imageUrl}
          accessibilityLabel={`Voting option: ${choice.label}`}
          style={{ width: '100%', aspectRatio: 1 }}
        />
      ) : null}
      <View style={{ gap: theme.spacing.sm, padding: theme.spacing.md }}>
        <AppText variant="cardTitle">{choice.label}</AppText>
        {choice.pitch ? (
          <View style={{ gap: theme.spacing.xxs }}>
            <AppText variant="label" color="muted">
              Campaign pitch
            </AppText>
            <AppText>{choice.pitch}</AppText>
          </View>
        ) : null}
        {profileUserId ? (
          <AppText color="muted" variant="caption">
            Tap this card to view the nominee’s profile and activity history.
          </AppText>
        ) : null}
      </View>
    </>
  );
  return (
    <Card
      accent={selected ? theme.colors.primary : undefined}
      style={{ padding: 0 }}
    >
      {profileUserId ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${choice.label}'s profile`}
          onPress={() => onProfilePress(profileUserId)}
          onFocus={() => setProfileFocused(true)}
          onBlur={() => setProfileFocused(false)}
          style={({ pressed }) => [
            { opacity: pressed ? 0.86 : 1 },
            focusRingStyle(profileFocused, theme.colors.info),
          ]}
        >
          {candidateDetails}
        </Pressable>
      ) : (
        <View>{candidateDetails}</View>
      )}
      <View style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md }}>
        <Button
          label={selected ? `${choice.label} selected` : `Choose ${choice.label}`}
          variant={selected ? 'primary' : 'secondary'}
          fullWidth
          onPress={() => onSelect(choice.id)}
        />
      </View>
    </Card>
  );
};
