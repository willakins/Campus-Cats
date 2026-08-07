import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import {
  AccessBanner,
  AppHeader,
  AppText,
  Button,
  Card,
  DetailSkeleton,
  EmptyState,
  ErrorState,
  FeedbackBanner,
  Screen,
  StatusPill,
} from '@/components/design';
import { ProgressiveImage } from '@/components/ui/ProgressiveImage';
import { appModules } from '@/composition/appModules';
import {
  CommunityVote,
  CommunityVotePhase,
  communityVotePhase,
  parseUser,
} from '@/core/domain';
import {
  CommunityVoteResults,
} from '@/core/ports';
import { CommunityVotingChoice } from '@/features/communityVoting';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

const ViewCommunityVote = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const actor = parseUser(useAuth().user);
  const theme = useAppTheme();
  const [vote, setVote] = useState<CommunityVote>();
  const [phase, setPhase] = useState<CommunityVotePhase>();
  const [choices, setChoices] = useState<readonly CommunityVotingChoice[]>([]);
  const [results, setResults] = useState<CommunityVoteResults>();
  const [submittedNomination, setSubmittedNomination] = useState(false);
  const [submittedBallot, setSubmittedBallot] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [feedback, setFeedback] = useState<string>();

  const load = useCallback(async () => {
    if (!id) {
      setError('Missing vote ID');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    const voteResult = await appModules.communityVoting.get(actor, id);
    if (!voteResult.ok) {
      setError(voteResult.error.message);
      setLoading(false);
      return;
    }
    const loadedVote = voteResult.value;
    const currentPhase = communityVotePhase(loadedVote, new Date());
    setVote(loadedVote);
    setPhase(currentPhase);
    setChoices([]);
    setResults(undefined);

    if (currentPhase === 'nominations') {
      const submitted = await appModules.communityVoting.hasSubmittedNomination(
        actor,
        id,
      );
      if (submitted.ok) setSubmittedNomination(submitted.value);
      else setError(submitted.error.message);
    } else if (currentPhase === 'voting') {
      const [submitted, choiceResult] = await Promise.all([
        appModules.communityVoting.hasSubmittedBallot(actor, id),
        appModules.communityVoting.choices(actor, loadedVote),
      ]);
      if (submitted.ok) setSubmittedBallot(submitted.value);
      else setError(submitted.error.message);
      if (choiceResult.ok) setChoices(choiceResult.value);
      else setError(choiceResult.error.message);
    } else {
      const result = await appModules.communityVoting.results(actor, id);
      if (result.ok) setResults(result.value);
      else setError(result.error.message);
    }
    setLoading(false);
  }, [actor.id, actor.role, id]);

  useFocusEffect(
    useCallback(() => {
      void load();
      const refresh = setInterval(() => void load(), 60_000);
      return () => clearInterval(refresh);
    }, [load]),
  );

  const nominate = async (action: 'nominate' | 'abstain') => {
    if (!vote || busy) return;
    setBusy(true);
    setError(undefined);
    const result = await appModules.communityVoting.submitNomination(
      actor,
      vote.id,
      action,
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setSubmittedNomination(true);
    setFeedback(
      action === 'nominate'
        ? 'You are now a nominee for club president.'
        : 'Your decision to abstain from nominations was recorded.',
    );
  };

  const submitBallot = async () => {
    if (!vote || !selectedOptionId || busy) return;
    setBusy(true);
    setError(undefined);
    const result = await appModules.communityVoting.submitBallot(
      actor,
      vote.id,
      selectedOptionId,
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setSubmittedBallot(true);
    setFeedback('Your private ballot has been recorded.');
  };

  const footer =
    vote && phase === 'voting' && choices.length > 0 && !submittedBallot ? (
      <Button
        label="Submit Vote"
        loading={busy}
        loadingLabel="Submitting vote…"
        disabled={!selectedOptionId}
        fullWidth
        onPress={() => void submitBallot()}
      />
    ) : undefined;
  const leadingVotes = results
    ? Math.max(0, ...results.options.map(({ votes }) => votes))
    : 0;

  return (
    <Screen scroll footer={footer}>
      <AppHeader
        title="Community vote"
        eyebrow="One member, one vote"
        onBack={() => router.back()}
      />
      {loading ? (
        <DetailSkeleton label="Loading vote" />
      ) : vote && phase ? (
        <View style={{ gap: theme.spacing.md }}>
          <Card accent={vote.kind === 'presidential_election' ? theme.colors.gold : theme.colors.violet}>
            <View style={{ gap: theme.spacing.sm }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                <StatusPill
                  tone={vote.kind === 'presidential_election' ? 'warning' : 'info'}
                  label={vote.kind === 'presidential_election' ? 'President election' : 'Contest'}
                />
                <StatusPill
                  tone={phase === 'closed' ? 'neutral' : phase === 'voting' ? 'success' : 'primary'}
                  label={{ nominations: 'Nominations open', voting: 'Voting open', closed: 'Closed' }[phase]}
                />
              </View>
              <AppText variant="pageTitle">{vote.title}</AppText>
              {vote.details ? <AppText color="muted">{vote.details}</AppText> : null}
              {vote.kind === 'presidential_election' ? (
                <AppText color="muted" variant="caption">
                  Nominations close {formatDateTime(vote.votingStartsAt)} · Voting closes {formatDateTime(vote.votingEndsAt)}
                </AppText>
              ) : (
                <AppText color="muted" variant="caption">
                  Voting closes {formatDateTime(vote.votingEndsAt)}
                </AppText>
              )}
            </View>
          </Card>

          {error ? <FeedbackBanner tone="danger" message={error} /> : null}
          {feedback ? <FeedbackBanner tone="success" message={feedback} /> : null}

          {phase === 'nominations' ? (
            submittedNomination ? (
              <EmptyState
                title="Nomination response recorded"
                message="Come back when the voting round starts to choose from the nominees."
              />
            ) : (
              <Card>
                <View style={{ gap: theme.spacing.md }}>
                  <AccessBanner
                    title="Round one: nominations"
                    message="Nominate yourself for club president or abstain. You can make this choice once."
                  />
                  <Button
                    label="Nominate Myself"
                    icon="person-add-outline"
                    loading={busy}
                    fullWidth
                    onPress={() => void nominate('nominate')}
                  />
                  <Button
                    label="Abstain From Nominations"
                    variant="secondary"
                    disabled={busy}
                    fullWidth
                    onPress={() => void nominate('abstain')}
                  />
                </View>
              </Card>
            )
          ) : phase === 'voting' ? (
            submittedBallot ? (
              <EmptyState
                title="Vote submitted"
                message="Your private ballot is recorded. Results will appear after voting closes."
              />
            ) : choices.length === 0 ? (
              <EmptyState
                title="No nominees available"
                message="No one entered this presidential election, so there is no ballot to submit."
              />
            ) : (
              <View style={{ gap: theme.spacing.md }}>
                <AccessBanner
                  title="Private ballot"
                  message="Choose one option. Your identity is stored only in a private receipt that prevents duplicate voting."
                />
                {choices.map((choice) => {
                  const selected = selectedOptionId === choice.id;
                  return (
                    <Card
                      key={choice.id}
                      accent={selected ? theme.colors.primary : undefined}
                      style={choice.imageUrl ? { padding: 0 } : undefined}
                    >
                      {choice.imageUrl ? (
                        <ProgressiveImage
                          uri={choice.imageUrl}
                          accessibilityLabel={`Voting option: ${choice.label}`}
                          style={{ width: '100%', aspectRatio: 1 }}
                        />
                      ) : null}
                      <View style={{ gap: theme.spacing.sm, ...(choice.imageUrl ? { padding: theme.spacing.md } : {}) }}>
                        <AppText variant="cardTitle">{choice.label}</AppText>
                        <Button
                          label={selected ? `${choice.label} selected` : `Choose ${choice.label}`}
                          variant={selected ? 'primary' : 'secondary'}
                          fullWidth
                          onPress={() => setSelectedOptionId(choice.id)}
                        />
                      </View>
                    </Card>
                  );
                })}
              </View>
            )
          ) : results ? (
            <View style={{ gap: theme.spacing.md }}>
              <AccessBanner
                title="Final results"
                message={`${results.totalVotes} ${results.totalVotes === 1 ? 'ballot was' : 'ballots were'} cast.`}
              />
              {results.options.map((option) => (
                <Card
                  key={option.id}
                  accent={
                    leadingVotes > 0 && option.votes === leadingVotes
                      ? theme.colors.success
                      : undefined
                  }
                >
                  <View style={{ gap: theme.spacing.sm }}>
                    {option.imageUrl ? (
                      <ProgressiveImage
                        uri={option.imageUrl}
                        accessibilityLabel={`Result option: ${option.label}`}
                        style={{ width: '100%', aspectRatio: 1, borderRadius: theme.radii.field }}
                      />
                    ) : null}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.sm }}>
                      <AppText variant="cardTitle" style={{ flex: 1 }}>{option.label}</AppText>
                      <AppText variant="section" color="primary">{option.votes}</AppText>
                    </View>
                    <AppText color="muted" variant="caption">
                      {percentage(option.votes, results.totalVotes)}% of ballots
                    </AppText>
                  </View>
                </Card>
              ))}
              {results.options.length === 0 ? (
                <EmptyState title="No final candidates" message="This vote closed without any eligible options." />
              ) : null}
            </View>
          ) : (
            <EmptyState title="No results" message="No results are available for this vote." />
          )}
        </View>
      ) : (
        <ErrorState title="Vote unavailable" message={error || 'Vote not found'} />
      )}
    </Screen>
  );
};

const formatDateTime = (date: Date): string =>
  date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const percentage = (votes: number, total: number): number =>
  total > 0 ? Math.round((votes / total) * 100) : 0;

export default ViewCommunityVote;
