import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';

import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import {
  CommunitySection,
  CommunitySectionGrid,
  CommunityVoteItem,
  DonationPage,
  EventItem,
  AnnouncementSort,
  AnnouncementToolbar,
  SurveyItem,
} from '@/components/community';
import { virtualizedListPerformanceProps } from '@/components/collections/virtualizedListPerformance';
import {
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
  CommunityVote,
  Survey,
  canAccessRolePolicy,
  communityVotePhase,
  isExpiredEvent,
  parseUser,
  roleAccessPolicies,
} from '@/core/domain';
import { AnnouncementListItem } from '@/features/announcements';
import { EventListItem } from '@/features/events';
import { useAppSettings, useAuth, useClub } from '@/providers';
import { useAppTheme } from '@/theme';

const validSection = (
  value: string | string[] | undefined,
): CommunitySection | undefined => {
  const section = Array.isArray(value) ? value[0] : value;
  return section === 'announcements' ||
    section === 'events' ||
    section === 'surveys' ||
    section === 'votes' ||
    section === 'donate' ||
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
  const { refreshSettings, settings } = useAppSettings();
  const { access } = useClub();
  const theme = useAppTheme();
  const canManageEvents = canAccessRolePolicy(
    actor.role,
    roleAccessPolicies.manageEvents,
  );
  const canManageDonations = canAccessRolePolicy(
    actor.role,
    roleAccessPolicies.manageDonations,
  );
  const [section, setSection] = useState<CommunitySection | undefined>(() =>
    validSection(requestedSection),
  );
  const [eventFilter, setEventFilter] = useState<'upcoming' | 'past'>(
    'upcoming',
  );
  const [surveyFilter, setSurveyFilter] = useState<'open' | 'closed'>('open');
  const [voteFilter, setVoteFilter] = useState<'active' | 'closed'>('active');
  const [announcementQuery, setAnnouncementQuery] = useState('');
  const [announcementSort, setAnnouncementSort] =
    useState<AnnouncementSort>('most-recent');
  const [announcements, setAnnouncements] = useState<
    readonly AnnouncementListItem[]
  >([]);
  const [events, setEvents] = useState<readonly EventListItem[]>([]);
  const [surveys, setSurveys] = useState<readonly Survey[]>([]);
  const [votes, setVotes] = useState<readonly CommunityVote[]>([]);
  const [hasIncompleteSurvey, setHasIncompleteSurvey] = useState(false);
  const [hasUnsubmittedBallot, setHasUnsubmittedBallot] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<
    Partial<Record<CommunitySection, string>>
  >({});

  useEffect(() => {
    if (section === 'donate') void refreshSettings();
  }, [refreshSettings, section]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrors({});
    const [announcementResult, eventResult, surveyResult, voteResult] =
      await Promise.all([
        appModules.announcements.list(actor),
        appModules.events.list(actor),
        appModules.surveys.list(actor),
        appModules.communityVoting.list(actor),
      ]);
    if (announcementResult.ok) setAnnouncements(announcementResult.value);
    else
      setErrors((current) => ({
        ...current,
        announcements: announcementResult.error.message,
      }));
    if (eventResult.ok) setEvents(eventResult.value);
    else
      setErrors((current) => ({
        ...current,
        events: eventResult.error.message,
      }));
    if (surveyResult.ok) setSurveys(surveyResult.value);
    else
      setErrors((current) => ({
        ...current,
        surveys: surveyResult.error.message,
      }));
    if (voteResult.ok) setVotes(voteResult.value);
    else
      setErrors((current) => ({ ...current, votes: voteResult.error.message }));
    const [surveyAttentionResult, voteAttentionResult] = await Promise.all([
      surveyResult.ok
        ? appModules.surveys.hasIncompleteOpenSurvey(actor, surveyResult.value)
        : undefined,
      voteResult.ok
        ? appModules.communityVoting.hasUnsubmittedOpenBallot(
            actor,
            voteResult.value,
          )
        : undefined,
    ]);
    setHasIncompleteSurvey(
      surveyAttentionResult?.ok ? surveyAttentionResult.value : false,
    );
    setHasUnsubmittedBallot(
      voteAttentionResult?.ok ? voteAttentionResult.value : false,
    );
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
      canManageEvents
        ? events.filter((event) =>
            eventFilter === 'past'
              ? isExpiredEvent(event, now)
              : !isExpiredEvent(event, now),
          )
        : events,
    [canManageEvents, eventFilter, events, now],
  );
  const visibleAnnouncements = useMemo(() => {
    const normalizedQuery = announcementQuery.trim().toLocaleLowerCase();
    return announcements
      .filter((announcement) =>
        announcement.title.toLocaleLowerCase().includes(normalizedQuery),
      )
      .slice()
      .sort((left, right) =>
        announcementSort === 'most-recent'
          ? right.createdAt.getTime() - left.createdAt.getTime()
          : left.createdAt.getTime() - right.createdAt.getTime(),
      );
  }, [announcementQuery, announcementSort, announcements]);
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
        donate: undefined,
        chat: undefined,
      }[section]
    : undefined;
  const createLabel = section
    ? {
        announcements: 'Create announcement',
        events: 'Create event',
        surveys: 'Create survey',
        votes: 'Create vote',
        donate: '',
        chat: '',
      }[section]
    : '';
  const createPolicy = section
    ? {
        announcements: roleAccessPolicies.manageAnnouncements,
        events: roleAccessPolicies.manageEvents,
        surveys: roleAccessPolicies.manageSurveys,
        votes: roleAccessPolicies.createContests,
        donate: undefined,
        chat: undefined,
      }[section]
    : undefined;
  const canCreate = createPolicy
    ? canAccessRolePolicy(actor.role, createPolicy)
    : false;

  const list = (() => {
    if (section === 'announcements') {
      return (
        <FlatList
          {...virtualizedListPerformanceProps}
          data={errors.announcements ? [] : visibleAnnouncements}
          keyExtractor={(announcement) => announcement.id}
          contentContainerStyle={{
            flexGrow: 1,
            gap: theme.spacing.sm,
            paddingBottom: theme.spacing.huge * 2,
          }}
          renderItem={({ item }) => <AnnouncementItem {...item} />}
          ListEmptyComponent={
            errors.announcements ? (
              <ErrorState
                title="Announcements are unavailable"
                message={errors.announcements}
                onRetry={() => void load()}
              />
            ) : (
              <EmptyState
                title={
                  announcementQuery.trim()
                    ? 'No matching announcements'
                    : 'No announcements yet'
                }
                message={
                  announcementQuery.trim()
                    ? 'Try searching for a different title.'
                    : 'Club news and volunteer updates will appear here.'
                }
              />
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
          contentContainerStyle={{
            flexGrow: 1,
            gap: theme.spacing.md,
            paddingBottom: theme.spacing.huge * 2,
          }}
          renderItem={({ item }) => <EventItem event={item} now={now} />}
          ListEmptyComponent={
            errors.events ? (
              <ErrorState
                title="Events are unavailable"
                message={errors.events}
                onRetry={() => void load()}
              />
            ) : (
              <EmptyState
                title={
                  eventFilter === 'past'
                    ? 'No expired events'
                    : 'No upcoming events'
                }
                message={
                  eventFilter === 'past'
                    ? 'Expired events remain available to officers here.'
                    : 'New club events will appear here.'
                }
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
          contentContainerStyle={{
            flexGrow: 1,
            gap: theme.spacing.md,
            paddingBottom: theme.spacing.huge * 2,
          }}
          renderItem={({ item }) => <SurveyItem survey={item} />}
          ListEmptyComponent={
            errors.surveys ? (
              <ErrorState
                title="Surveys are unavailable"
                message={errors.surveys}
                onRetry={() => void load()}
              />
            ) : (
              <EmptyState
                title={
                  surveyFilter === 'closed'
                    ? 'No past surveys'
                    : 'No open surveys'
                }
                message={
                  surveyFilter === 'closed'
                    ? 'Closed survey response history will remain available here.'
                    : 'New member surveys will appear here.'
                }
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
          contentContainerStyle={{
            flexGrow: 1,
            gap: theme.spacing.md,
            paddingBottom: theme.spacing.huge * 2,
          }}
          renderItem={({ item }) => <CommunityVoteItem vote={item} now={now} />}
          ListEmptyComponent={
            errors.votes ? (
              <ErrorState
                title="Votes are unavailable"
                message={errors.votes}
                onRetry={() => void load()}
              />
            ) : (
              <EmptyState
                title={
                  voteFilter === 'closed'
                    ? 'No completed votes'
                    : 'No active votes'
                }
                message={
                  voteFilter === 'closed'
                    ? 'Completed contest and election results will remain here.'
                    : 'New contests and club elections will appear here.'
                }
              />
            )
          }
        />
      );
    }
    if (section === 'chat')
      return (
        <EmptyState
          title="Chat is coming soon"
          message="This space is reserved for future Campus Cats conversations."
        />
      );
    if (section === 'donate') {
      return (
        <DonationPage
          page={settings.donationPage}
          clubName={access?.clubName ?? 'Your club'}
        />
      );
    }
    return null;
  })();

  return (
    <Screen
      floatingAction={
        section === 'donate' && canManageDonations ? (
          <FloatingActionButton
            icon="create-outline"
            accessibilityLabel={
              settings.donationPage.title.trim()
                ? 'Edit donation page'
                : 'Create donation page'
            }
            accessibilityHint="Opens the President-level donation page form"
            onPress={() => router.push('/donations/edit-donation' as never)}
          />
        ) : canCreate && createRoute ? (
          <FloatingActionButton
            accessibilityLabel={createLabel}
            accessibilityHint="Opens the form for a new Community item"
            onPress={() => router.push(createRoute as never)}
          />
        ) : undefined
      }
    >
      <AppHeader
        title="Community"
        eyebrow="Connect with Campus Cats"
        action={
          section ? (
            <IconButton
              icon="grid-outline"
              accessibilityLabel="Show Community menu"
              onPress={() => setSection(undefined)}
            />
          ) : undefined
        }
      />
      {!section ? (
        <CommunitySectionGrid
          onChange={setSection}
          needsAttention={{
            announcements: announcements.some(
              (announcement) => !announcement.read,
            ),
            events: events.some(
              (event) => !event.read && !isExpiredEvent(event, now),
            ),
            surveys: hasIncompleteSurvey,
            votes: hasUnsubmittedBallot,
          }}
        />
      ) : null}
      {section === 'announcements' ? (
        <View style={{ paddingBottom: theme.spacing.md }}>
          <AnnouncementToolbar
            query={announcementQuery}
            sort={announcementSort}
            onQueryChange={setAnnouncementQuery}
            onSortChange={setAnnouncementSort}
          />
        </View>
      ) : section === 'events' && canManageEvents ? (
        <View style={{ paddingBottom: theme.spacing.md }}>
          <SegmentedControl
            label="Event status"
            value={eventFilter}
            options={[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'past', label: 'Expired' },
            ]}
            onChange={setEventFilter}
          />
        </View>
      ) : section === 'surveys' ? (
        <View style={{ paddingBottom: theme.spacing.md }}>
          <SegmentedControl
            label="Survey status"
            value={surveyFilter}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'closed', label: 'Past' },
            ]}
            onChange={setSurveyFilter}
          />
        </View>
      ) : section === 'votes' ? (
        <View
          style={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.md }}
        >
          <SegmentedControl
            label="Vote status"
            value={voteFilter}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'closed', label: 'Results' },
            ]}
            onChange={setVoteFilter}
          />
        </View>
      ) : null}
      {section && loading && section !== 'chat' && section !== 'donate' ? (
        <CardListSkeleton label={`Loading ${section}`} />
      ) : section ? (
        list
      ) : null}
    </Screen>
  );
};

export default Community;
