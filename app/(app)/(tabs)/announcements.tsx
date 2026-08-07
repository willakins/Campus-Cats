import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';

import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import {
  CommunitySection,
  CommunitySectionGrid,
  CommunitySectionNav,
  CommunityVoteItem,
  EventItem,
  SurveyItem,
} from '@/components/community';
import { virtualizedListPerformanceProps } from '@/components/collections/virtualizedListPerformance';
import {
  AccessBanner,
  AppHeader,
  CardListSkeleton,
  EmptyState,
  ErrorState,
  FloatingActionButton,
  IconButton,
  Screen,
  SegmentedControl,
} from '@/components/design';
import { AnnouncementItem } from '@/components/items/AnnouncementItem';
import { appModules } from '@/composition/appModules';
import {
  Announcement,
  ClubEvent,
  CommunityVote,
  Survey,
  canManageFeature,
  communityVotePhase,
  isExpiredEvent,
  parseUser,
} from '@/core/domain';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

const validSection = (
  value: string | string[] | undefined,
): CommunitySection | undefined => {
  const section = Array.isArray(value) ? value[0] : value;
  return section === 'announcements' ||
    section === 'events' ||
    section === 'surveys' ||
    section === 'votes' ||
    section === 'chat'
    ? section
    : undefined;
};

const Community = () => {
  const { section: requestedSection } = useLocalSearchParams<{
    section?: string | string[];
  }>();
  const { user } = useAuth();
  const actor = parseUser(user);
  const theme = useAppTheme();
  const isOfficer = canManageFeature(actor.role);
  const [section, setSection] = useState<CommunitySection | undefined>(() =>
    validSection(requestedSection),
  );
  const [eventFilter, setEventFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [surveyFilter, setSurveyFilter] = useState<'open' | 'closed'>('open');
  const [voteFilter, setVoteFilter] = useState<'active' | 'closed'>('active');
  const [announcements, setAnnouncements] = useState<readonly Announcement[]>([]);
  const [events, setEvents] = useState<readonly ClubEvent[]>([]);
  const [surveys, setSurveys] = useState<readonly Survey[]>([]);
  const [votes, setVotes] = useState<readonly CommunityVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<CommunitySection, string>>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setErrors({});
    const [announcementResult, eventResult, surveyResult, voteResult] = await Promise.all([
      appModules.announcements.list(),
      appModules.events.list(actor),
      appModules.surveys.list(actor),
      appModules.communityVoting.list(actor),
    ]);
    if (announcementResult.ok) setAnnouncements(announcementResult.value);
    else setErrors((current) => ({ ...current, announcements: announcementResult.error.message }));
    if (eventResult.ok) setEvents(eventResult.value);
    else setErrors((current) => ({ ...current, events: eventResult.error.message }));
    if (surveyResult.ok) setSurveys(surveyResult.value);
    else setErrors((current) => ({ ...current, surveys: surveyResult.error.message }));
    if (voteResult.ok) setVotes(voteResult.value);
    else setErrors((current) => ({ ...current, votes: voteResult.error.message }));
    setLoading(false);
  }, [actor.id, actor.role]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const now = useMemo(() => new Date(), [events, votes]);
  const visibleEvents = useMemo(
    () =>
      isOfficer
        ? events.filter((event) =>
            eventFilter === 'past'
              ? isExpiredEvent(event, now)
              : !isExpiredEvent(event, now),
          )
        : events,
    [eventFilter, events, isOfficer, now],
  );
  const visibleSurveys = useMemo(
    () =>
      surveys.filter((survey) =>
        surveyFilter === 'open'
          ? survey.status === 'open'
          : survey.status === 'closed',
      ),
    [surveyFilter, surveys],
  );
  const visibleVotes = useMemo(
    () =>
      votes.filter((vote) =>
        voteFilter === 'closed'
          ? communityVotePhase(vote, now) === 'closed'
          : communityVotePhase(vote, now) !== 'closed',
      ),
    [now, voteFilter, votes],
  );

  const createRoute = section
    ? {
        announcements: '/announcements/create-ann',
        events: '/events/create-event',
        surveys: '/surveys/create-survey',
        votes: '/votes/create-vote',
        chat: undefined,
      }[section]
    : undefined;
  const createLabel = section
    ? {
        announcements: 'Create announcement',
        events: 'Create event',
        surveys: 'Create survey',
        votes: 'Create vote',
        chat: '',
      }[section]
    : '';

  const list = (() => {
    if (section === 'announcements') {
      return (
        <FlatList
          {...virtualizedListPerformanceProps}
          data={errors.announcements ? [] : announcements}
          keyExtractor={(announcement) => announcement.id}
          contentContainerStyle={{ flexGrow: 1, gap: theme.spacing.md, paddingBottom: theme.spacing.huge * 2 }}
          renderItem={({ item }) => <AnnouncementItem {...item} />}
          ListEmptyComponent={
            errors.announcements ? (
              <ErrorState title="Announcements are unavailable" message={errors.announcements} onRetry={() => void load()} />
            ) : (
              <EmptyState title="No announcements yet" message="Club news and volunteer updates will appear here." />
            )
          }
        />
      );
    }
    if (section === 'events') {
      return (
        <FlatList
          {...virtualizedListPerformanceProps}
          data={errors.events ? [] : visibleEvents}
          keyExtractor={(event) => event.id}
          contentContainerStyle={{ flexGrow: 1, gap: theme.spacing.md, paddingBottom: theme.spacing.huge * 2 }}
          renderItem={({ item }) => <EventItem event={item} now={now} />}
          ListEmptyComponent={
            errors.events ? (
              <ErrorState title="Events are unavailable" message={errors.events} onRetry={() => void load()} />
            ) : (
              <EmptyState
                title={eventFilter === 'past' ? 'No expired events' : 'No upcoming events'}
                message={eventFilter === 'past' ? 'Expired events remain available to officers here.' : 'New club events will appear here.'}
              />
            )
          }
        />
      );
    }
    if (section === 'surveys') {
      return (
        <FlatList
          {...virtualizedListPerformanceProps}
          data={errors.surveys ? [] : visibleSurveys}
          keyExtractor={(survey) => survey.id}
          contentContainerStyle={{ flexGrow: 1, gap: theme.spacing.md, paddingBottom: theme.spacing.huge * 2 }}
          renderItem={({ item }) => <SurveyItem survey={item} />}
          ListEmptyComponent={
            errors.surveys ? (
              <ErrorState title="Surveys are unavailable" message={errors.surveys} onRetry={() => void load()} />
            ) : (
              <EmptyState
                title={surveyFilter === 'closed' ? 'No past surveys' : 'No open surveys'}
                message={surveyFilter === 'closed' ? 'Closed survey response history will remain available here.' : 'New member surveys will appear here.'}
              />
            )
          }
        />
      );
    }
    if (section === 'votes') {
      return (
        <FlatList
          {...virtualizedListPerformanceProps}
          data={errors.votes ? [] : visibleVotes}
          keyExtractor={(vote) => vote.id}
          contentContainerStyle={{ flexGrow: 1, gap: theme.spacing.md, paddingBottom: theme.spacing.huge * 2 }}
          renderItem={({ item }) => <CommunityVoteItem vote={item} now={now} />}
          ListEmptyComponent={
            errors.votes ? (
              <ErrorState title="Votes are unavailable" message={errors.votes} onRetry={() => void load()} />
            ) : (
              <EmptyState
                title={voteFilter === 'closed' ? 'No completed votes' : 'No active votes'}
                message={voteFilter === 'closed' ? 'Completed contest and election results will remain here.' : 'New contests and club elections will appear here.'}
              />
            )
          }
        />
      );
    }
    if (section === 'chat') return (
      <EmptyState
        title="Chat is coming soon"
        message="This space is reserved for future Campus Cats conversations."
      />
    );
    return null;
  })();

  return (
    <Screen
      floatingAction={isOfficer && createRoute ? (
        <FloatingActionButton
          accessibilityLabel={createLabel}
          accessibilityHint="Opens the form for a new Community item"
          onPress={() => router.push(createRoute as never)}
        />
      ) : undefined}
    >
      <AppHeader
        title="Community"
        eyebrow="Connect with Campus Cats"
        action={section ? (
          <IconButton
            icon="grid-outline"
            accessibilityLabel="Show Community menu"
            onPress={() => setSection(undefined)}
          />
        ) : undefined}
      />
      {section ? (
        <CommunitySectionNav value={section} onChange={setSection} />
      ) : (
        <CommunitySectionGrid onChange={setSection} />
      )}
      {section === 'announcements' ? (
        <View style={{ paddingBottom: theme.spacing.md }}>
          <AccessBanner title="Announcement access" message="Everyone can read club updates. Only officers can publish or edit announcements." />
        </View>
      ) : section === 'events' && isOfficer ? (
        <View style={{ paddingBottom: theme.spacing.md }}>
          <SegmentedControl
            label="Event status"
            value={eventFilter}
            options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Expired' }]}
            onChange={setEventFilter}
          />
        </View>
      ) : section === 'surveys' ? (
        <View style={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.md }}>
          <AccessBanner title="Survey privacy" message="Every survey clearly says whether responses are anonymous or include your identity before you answer." />
          <SegmentedControl
            label="Survey status"
            value={surveyFilter}
            options={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Past' }]}
            onChange={setSurveyFilter}
          />
        </View>
      ) : section === 'votes' ? (
        <View style={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.md }}>
          <AccessBanner
            title="One member, one vote"
            message="Every active member gets one private ballot. Officers can create contests; only the President can start a presidential election."
          />
          <SegmentedControl
            label="Vote status"
            value={voteFilter}
            options={[{ value: 'active', label: 'Active' }, { value: 'closed', label: 'Results' }]}
            onChange={setVoteFilter}
          />
        </View>
      ) : null}
      {section && loading && section !== 'chat' ? (
        <CardListSkeleton label={`Loading ${section}`} />
      ) : section ? list : null}
    </Screen>
  );
};

export default Community;
