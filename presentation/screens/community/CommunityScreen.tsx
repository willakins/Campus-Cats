import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Platform, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import {
  CommunitySection,
  CommunitySectionGrid,
} from '@/presentation/screens/community/components';
import { VoteListItem } from '@/presentation/screens/community/votes/components/VoteListItem';
import { DonationsSection } from '@/presentation/screens/community/donations/components/DonationsSection';
import { EventListItem as EventListItemCard } from '@/presentation/screens/community/events/components/EventListItem';
import {
  AlertReadFilter,
  AlertSort,
  AlertToolbar,
} from '@/presentation/screens/community/alerts/components/AlertToolbar';
import { SurveyListItem } from '@/presentation/screens/community/surveys/components/SurveyListItem';
import { ChatSection } from '@/presentation/screens/community/chat/components';
import { virtualizedListPerformanceProps } from '@/presentation/patterns/lists/virtualizedListPerformance';
import {
  AppHeader,
  CardListSkeleton,
  EmptyState,
  ErrorState,
  FloatingActionButton,
  IconButton,
  Screen,
  SegmentedControl,
} from '@/presentation/ui';
import { AlertListItem as AlertListItemCard } from '@/presentation/screens/community/alerts/components/AlertListItem';
import { useFocusTask } from '@/presentation/hooks/useFocusTask';
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
import { AlertListItem } from '@/features/alerts';
import { EventListItem } from '@/features/events';
import { useAppSettings, useAuth, useClub } from '@/presentation/providers';
import { useAppTheme, useReducedMotion } from '@/theme';

const COMMUNITY_TRANSITION_DISTANCE = 28;

const validSection = (
  value: string | string[] | undefined,
): CommunitySection | undefined => {
  const section = Array.isArray(value) ? value[0] : value;
  return section === 'alerts' ||
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
  const reducedMotion = useReducedMotion();
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
  const [alertQuery, setAlertQuery] = useState('');
  const [alertReadFilter, setAlertReadFilter] =
    useState<AlertReadFilter>('all');
  const [alertSort, setAlertSort] =
    useState<AlertSort>('most-recent');
  const [alerts, setAlerts] = useState<
    readonly AlertListItem[]
  >([]);
  const [events, setEvents] = useState<readonly EventListItem[]>([]);
  const [surveys, setSurveys] = useState<readonly Survey[]>([]);
  const [votes, setVotes] = useState<readonly CommunityVote[]>([]);
  const [hasIncompleteSurvey, setHasIncompleteSurvey] = useState(false);
  const [hasUnsubmittedBallot, setHasUnsubmittedBallot] = useState(false);
  const [hasUnreadChatPing, setHasUnreadChatPing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<
    Partial<Record<CommunitySection, string>>
  >({});
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateY = useRef(new Animated.Value(0)).current;
  const activeTransition = useRef<Animated.CompositeAnimation | undefined>(
    undefined,
  );

  useEffect(
    () => () => {
      activeTransition.current?.stop();
    },
    [],
  );

  const changeSection = useCallback(
    (nextSection: CommunitySection | undefined) => {
      if (nextSection === section) return;
      if (reducedMotion) {
        activeTransition.current?.stop();
        contentOpacity.setValue(1);
        contentTranslateY.setValue(0);
        setSection(nextSection);
        return;
      }

      const direction = nextSection ? 1 : -1;
      activeTransition.current?.stop();
      setSection(nextSection);
      contentOpacity.setValue(0);
      contentTranslateY.setValue(direction * COMMUNITY_TRANSITION_DISTANCE);
      activeTransition.current = Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: theme.motion.content,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: theme.motion.content,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]);
      activeTransition.current.start();
    }, [contentOpacity, contentTranslateY, reducedMotion, section, theme.motion],
  );

  useEffect(() => {
    if (section === 'donate') void refreshSettings();
  }, [refreshSettings, section]);

  useEffect(
    () =>
      appModules.chat.observeUnreadPing(actor, (result) => {
        if (result.ok) setHasUnreadChatPing(result.value.unread);
      }),
    [actor.id],
  );

  const load = useCallback(async (isActive: () => boolean = () => true) => {
    setLoading(true);
    setErrors({});
    const [alertResult, eventResult, surveyResult, voteResult] =
      await Promise.all([
        appModules.alerts.list(actor),
        appModules.events.list(actor),
        appModules.surveys.list(actor),
        appModules.communityVoting.list(actor),
      ]);
    if (!isActive()) return;
    if (alertResult.ok) setAlerts(alertResult.value);
    else
      setErrors((current) => ({
        ...current,
        alerts: alertResult.error.message,
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
    if (!isActive()) return;
    setHasIncompleteSurvey(
      surveyAttentionResult?.ok ? surveyAttentionResult.value : false,
    );
    setHasUnsubmittedBallot(
      voteAttentionResult?.ok ? voteAttentionResult.value : false,
    );
    setLoading(false);
  }, [actor.id, actor.role]);

  useFocusTask(load);

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
  const visibleAlerts = useMemo(() => {
    const normalizedQuery = alertQuery.trim().toLocaleLowerCase();
    return alerts
      .filter((alert) =>
        alert.title.toLocaleLowerCase().includes(normalizedQuery),
      )
      .filter((alert) =>
        alertReadFilter === 'all'
          ? true
          : alert.read === (alertReadFilter === 'read'),
      )
      .slice()
      .sort((left, right) =>
        alertSort === 'most-recent'
          ? right.createdAt.getTime() - left.createdAt.getTime()
          : left.createdAt.getTime() - right.createdAt.getTime(),
      );
  }, [
    alertQuery,
    alertReadFilter,
    alertSort,
    alerts,
  ]);
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
        alerts: '/community/alerts/new',
        events: '/community/events/new',
        surveys: '/community/surveys/new',
        votes: '/community/votes/new',
        donate: undefined,
        chat: undefined,
      }[section]
    : undefined;
  const createLabel = section
    ? {
        alerts: 'Create alert',
        events: 'Create event',
        surveys: 'Create survey',
        votes: 'Create vote',
        donate: '',
        chat: '',
      }[section]
    : '';
  const createPolicy = section
    ? {
        alerts: roleAccessPolicies.manageAlerts,
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
    if (section === 'alerts') {
      return (
        <FlatList
          {...virtualizedListPerformanceProps}
          testID="alerts-list"
          data={errors.alerts ? [] : visibleAlerts}
          keyExtractor={(alert) => alert.id}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent:
              errors.alerts || visibleAlerts.length === 0
                ? 'center'
                : 'flex-start',
            gap: theme.spacing.sm,
            paddingBottom: theme.spacing.huge * 2,
          }}
          renderItem={({ item }) => <AlertListItemCard {...item} />}
          ListEmptyComponent={
            errors.alerts ? (
              <ErrorState
                title="Alerts are unavailable"
                message={errors.alerts}
                onRetry={() => void load()}
              />
            ) : (
              <EmptyState
                title={
                  alertQuery.trim()
                    ? 'No matching alerts'
                    : alertReadFilter === 'unread'
                      ? 'No unread alerts'
                      : alertReadFilter === 'read'
                        ? 'No read alerts'
                    : 'No alerts yet'
                }
                message={
                  alertQuery.trim()
                    ? 'Try searching for a different title.'
                    : alertReadFilter === 'unread'
                      ? "You're all caught up."
                      : alertReadFilter === 'read'
                        ? 'Alerts you have read will appear here.'
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
          testID="events-list"
          data={errors.events ? [] : visibleEvents}
          keyExtractor={(event) => event.id}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent:
              errors.events || visibleEvents.length === 0
                ? 'center'
                : 'flex-start',
            gap: theme.spacing.md,
            paddingBottom: theme.spacing.huge * 2,
          }}
          renderItem={({ item }) => <EventListItemCard event={item} now={now} />}
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
                    ? 'No past events'
                    : 'No upcoming events'
                }
                message={
                  eventFilter === 'past'
                    ? 'Past events remain available to officers here.'
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
          testID="surveys-list"
          data={errors.surveys ? [] : visibleSurveys}
          keyExtractor={(survey) => survey.id}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent:
              errors.surveys || visibleSurveys.length === 0
                ? 'center'
                : 'flex-start',
            gap: theme.spacing.md,
            paddingBottom: theme.spacing.huge * 2,
          }}
          renderItem={({ item }) => <SurveyListItem survey={item} />}
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
          testID="votes-list"
          data={errors.votes ? [] : visibleVotes}
          keyExtractor={(vote) => vote.id}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent:
              errors.votes || visibleVotes.length === 0
                ? 'center'
                : 'flex-start',
            gap: theme.spacing.md,
            paddingBottom: theme.spacing.huge * 2,
          }}
          renderItem={({ item }) => <VoteListItem vote={item} now={now} />}
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
                    ? 'No past votes'
                    : 'No active votes'
                }
                message={
                  voteFilter === 'closed'
                    ? 'Past contest and election results will remain here.'
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
        <ChatSection
          key={`${actor.id}:${access?.timezone ?? 'UTC'}`}
          actor={actor}
          timeZone={access?.timezone ?? 'UTC'}
        />
      );
    if (section === 'donate') {
      return (
        <DonationsSection
          page={settings.donationPage}
          clubName={access?.clubName ?? 'Your club'}
          canManage={canManageDonations}
          onManage={
            canManageDonations
              ? () => router.push('/community/donations/manage' as never)
              : undefined
          }
        />
      );
    }
    return null;
  })();

  return (
    <Screen
      keyboardAware={section === 'chat'}
      floatingAction={
        section !== 'donate' && canCreate && createRoute ? (
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
              onPress={() => changeSection(undefined)}
            />
          ) : undefined
        }
      />
      <Animated.View
        testID="community-content-transition"
        style={{
          flex: 1,
          opacity: contentOpacity,
          transform: [{ translateY: contentTranslateY }],
        }}
      >
        {!section ? (
          <CommunitySectionGrid
            onChange={changeSection}
            needsAttention={{
              alerts: alerts.some(
                (alert) => !alert.read,
              ),
              events: events.some(
                (event) => !event.read && !isExpiredEvent(event, now),
              ),
              surveys: hasIncompleteSurvey,
              votes: hasUnsubmittedBallot,
              chat: hasUnreadChatPing,
            }}
          />
        ) : null}
        {section === 'alerts' ? (
          <View style={{ paddingBottom: theme.spacing.md }}>
            <AlertToolbar
              query={alertQuery}
              sort={alertSort}
              readFilter={alertReadFilter}
              onQueryChange={setAlertQuery}
              onSortChange={setAlertSort}
              onReadFilterChange={setAlertReadFilter}
            />
          </View>
        ) : section === 'events' && canManageEvents ? (
          <View style={{ paddingBottom: theme.spacing.md }}>
            <SegmentedControl
              label="Event status"
              value={eventFilter}
              options={[
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'past', label: 'Past Events' },
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
                { value: 'closed', label: 'Past Votes' },
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
      </Animated.View>
    </Screen>
  );
};

export default Community;
