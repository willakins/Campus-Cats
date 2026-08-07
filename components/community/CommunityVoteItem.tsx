import React from 'react';
import { View } from 'react-native';

import { useRouter } from 'expo-router';

import {
  CommunityVote,
  communityVotePhase,
} from '../../core/domain';
import { useAppTheme } from '../../theme';
import { AppText, Card, StatusPill } from '../design';
import { ProgressiveImage } from '../ui/ProgressiveImage';

export const CommunityVoteItem = React.memo(function CommunityVoteItem({
  vote,
  now,
}: {
  readonly vote: CommunityVote;
  readonly now: Date;
}) {
  const router = useRouter();
  const theme = useAppTheme();
  const phase = communityVotePhase(vote, now);
  const imageUrl = vote.options.find(({ imageUrl }) => imageUrl)?.imageUrl;
  const phaseLabel = {
    nominations: 'Nominations open',
    voting: 'Voting open',
    closed: 'Results available',
  }[phase];

  return (
    <Card
      accessibilityLabel={`Open vote: ${vote.title}`}
      accent={vote.kind === 'presidential_election' ? theme.colors.gold : theme.colors.violet}
      onPress={() =>
        router.push({
          pathname: '/votes/view-vote' as never,
          params: { id: vote.id },
        })
      }
      style={imageUrl ? { padding: 0 } : undefined}
    >
      {imageUrl ? (
        <ProgressiveImage
          uri={imageUrl}
          accessibilityLabel={`Contest image for ${vote.title}`}
          style={{ width: '100%', aspectRatio: 16 / 9 }}
        />
      ) : null}
      <View
        style={{
          gap: theme.spacing.xs,
          ...(imageUrl ? { padding: theme.spacing.md } : {}),
        }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
          <StatusPill
            tone={vote.kind === 'presidential_election' ? 'warning' : 'info'}
            label={vote.kind === 'presidential_election' ? 'President election' : 'Contest'}
            icon={vote.kind === 'presidential_election' ? 'ribbon-outline' : 'trophy-outline'}
          />
          <StatusPill
            tone={phase === 'closed' ? 'neutral' : phase === 'voting' ? 'success' : 'primary'}
            label={phaseLabel}
          />
        </View>
        <AppText variant="cardTitle">{vote.title}</AppText>
        {vote.details ? (
          <AppText color="muted" numberOfLines={3}>{vote.details}</AppText>
        ) : null}
        <AppText color="muted" variant="caption">
          {phase === 'nominations'
            ? `Nominations close ${formatDate(vote.votingStartsAt)}`
            : phase === 'voting'
              ? `Voting closes ${formatDate(vote.votingEndsAt)}`
              : `Closed ${formatDate(vote.votingEndsAt)}`}
        </AppText>
      </View>
    </Card>
  );
});

const formatDate = (date: Date): string =>
  date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
