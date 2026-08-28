import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  View,
} from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { ReactionStrip } from '@softwhere-uz/react-native-emoji-keyboard';

import { RestrictedAccess } from '@/components/access';
import {
  AppText,
  Button,
  Dialog,
  FeedbackBanner,
  IconButton,
  StatusPill,
} from '@/components/design';
import { ChoiceField, FormTextInput } from '@/components/forms';
import { ProfileAvatar } from '@/components/profile';
import { appModules } from '@/composition/appModules';
import {
  CHAT_MESSAGE_CHARACTER_LIMIT,
  ChatDay,
  ChatMessage,
  ChatReaction,
  ChatRestriction,
  Role,
  User,
  chatDayKey,
  chatRestrictionActive,
  canAccessRolePolicy,
  canManageFeature,
  parseChatDay,
  parseChatReaction,
  roleAccessPolicies,
} from '@/core/domain';
import { useAppTheme } from '@/theme';
import { ChatEmojiPickerModal } from './EmojiPickerModal';

interface ChatSectionProps {
  readonly actor: User;
  readonly timeZone: string;
}

type PickerTarget =
  | { readonly kind: 'composer' }
  | { readonly kind: 'reaction'; readonly message: ChatMessage };

export const ChatSection = ({ actor, timeZone }: ChatSectionProps) => {
  const theme = useAppTheme();
  const listRef = useRef<FlashListRef<ChatMessage>>(null);
  const initiallyScrolled = useRef(false);
  const mounted = useRef(true);
  const historyRequest = useRef(0);
  const scrollFrame = useRef<number | undefined>(undefined);
  const [currentDayKey, setCurrentDayKey] = useState(() =>
    chatDayKey(new Date(), timeZone),
  );
  const [now, setNow] = useState(() => new Date());
  const [dayKeys, setDayKeys] = useState<readonly string[]>([currentDayKey]);
  const [days, setDays] = useState<ReadonlyMap<string, ChatDay>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [retryRevision, setRetryRevision] = useState(0);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string>();
  const [hasOlder, setHasOlder] = useState(true);
  const [draft, setDraft] = useState('');
  const [isClubPing, setIsClubPing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [feedback, setFeedback] = useState<string>();
  const [restriction, setRestriction] = useState<ChatRestriction>();
  const [reactionTarget, setReactionTarget] = useState<ChatMessage>();
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>();
  const [moderationTarget, setModerationTarget] = useState<ChatMessage>();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      historyRequest.current += 1;
      if (scrollFrame.current !== undefined) {
        cancelAnimationFrame(scrollFrame.current);
      }
    };
  }, []);

  useEffect(() => {
    const updateCurrentDay = () => {
      const nextNow = new Date();
      setNow(nextNow);
      const next = chatDayKey(nextNow, timeZone);
      setCurrentDayKey((current) => {
        if (current !== next) {
          setDayKeys((keys) => [...new Set([...keys, next])].sort());
        }
        return next;
      });
    };
    updateCurrentDay();
    const interval = setInterval(updateCurrentDay, 60_000);
    return () => clearInterval(interval);
  }, [timeZone]);

  useEffect(() => {
    setLoadError(undefined);
    return appModules.chat.observeDay(actor, currentDayKey, (result) => {
      if (!result.ok) {
        setLoadError(result.error.message);
        setLoading(false);
        return;
      }
      setDays((current) => {
        const next = new Map(current);
        next.set(currentDayKey, result.value);
        return next;
      });
      setLoading(false);
    });
  }, [actor.id, currentDayKey, retryRevision]);

  useEffect(
    () =>
      appModules.chat.observeCurrentRestriction(actor, (result) => {
        if (result.ok) setRestriction(result.value);
      }),
    [actor.id],
  );

  useEffect(
    () =>
      appModules.chat.observeUnreadPing(actor, (result) => {
        if (result.ok && result.value.unread) {
          void appModules.chat.markPingsRead(actor);
        }
      }),
    [actor.id],
  );

  const messages = useMemo(
    () =>
      dayKeys
        .flatMap((key) => days.get(key)?.messages ?? [])
        .sort(
          (left, right) =>
            left.createdAt.getTime() - right.createdAt.getTime() ||
            left.id.localeCompare(right.id),
        ),
    [dayKeys, days],
  );
  const reactions = useMemo(
    () => dayKeys.flatMap((key) => days.get(key)?.reactions ?? []),
    [dayKeys, days],
  );
  const reactionsByMessage = useMemo(() => {
    const grouped = new Map<string, ChatReaction[]>();
    for (const reaction of reactions) {
      const messageReactions = grouped.get(reaction.messageId) ?? [];
      messageReactions.push(reaction);
      grouped.set(reaction.messageId, messageReactions);
    }
    return grouped;
  }, [reactions]);
  const messageDateFormatters = useMemo(
    () => ({
      date: new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeZone,
      }),
      current: new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone,
      }),
    }),
    [timeZone],
  );
  const readOnly = chatRestrictionActive(restriction, now);

  const loadOlder = async () => {
    if (loading || loadingOlder || !hasOlder) return;
    const request = ++historyRequest.current;
    setLoadingOlder(true);
    setOlderError(undefined);
    const oldest = [...dayKeys].sort()[0] ?? currentDayKey;
    const result = await appModules.chat.findPreviousActiveDay(actor, oldest);
    if (!mounted.current || request !== historyRequest.current) return;
    if (!result.ok) {
      setOlderError(result.error.message);
      setLoadingOlder(false);
      return;
    }
    if (!result.value) {
      setHasOlder(false);
      setLoadingOlder(false);
      return;
    }
    const history = await appModules.chat.loadDay(actor, result.value);
    if (!mounted.current || request !== historyRequest.current) return;
    if (!history.ok) {
      setOlderError(history.error.message);
      setLoadingOlder(false);
      return;
    }
    setDays((current) => {
      const next = new Map(current);
      next.set(result.value as string, history.value);
      return next;
    });
    setDayKeys((current) =>
      [...new Set([...current, result.value as string])].sort(),
    );
    setLoadingOlder(false);
  };

  const send = async () => {
    if (sending || readOnly || !draft.trim()) return;
    setSending(true);
    setError(undefined);
    setFeedback(undefined);
    const result = await appModules.chat.sendMessage(
      actor,
      draft,
      isClubPing,
    );
    if (!mounted.current) return;
    setSending(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setDraft('');
    setIsClubPing(false);
    setFeedback(result.warnings[0]?.message);
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = undefined;
      listRef.current?.scrollToEnd({ animated: true });
    });
  };

  const react = async (message: ChatMessage, emoji: string) => {
    setError(undefined);
    const result = await appModules.chat.setReaction(
      actor,
      message.id,
      message.dayKey,
      emoji,
    );
    if (!mounted.current) return;
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setDays((current) => {
      const day = current.get(message.dayKey);
      if (!day) return current;
      const existing = day.reactions.find(
        (reaction) =>
          reaction.messageId === message.id && reaction.userId === actor.id,
      );
      const otherReactions = day.reactions.filter(
        (reaction) =>
          reaction.messageId !== message.id || reaction.userId !== actor.id,
      );
      const reactions = existing?.emoji === emoji
        ? otherReactions
        : [
            ...otherReactions,
            parseChatReaction({
              messageId: message.id,
              messageDayKey: message.dayKey,
              userId: actor.id,
              emoji,
              updatedAt: new Date(),
            }),
          ];
      const next = new Map(current);
      next.set(message.dayKey, parseChatDay({ ...day, reactions }));
      return next;
    });
  };

  const chooseEmoji = (emoji: string) => {
    if (!pickerTarget) return;
    if (pickerTarget.kind === 'composer') {
      setDraft((current) => `${current}${emoji}`.slice(0, CHAT_MESSAGE_CHARACTER_LIMIT));
      return;
    }
    void react(pickerTarget.message, emoji);
    setPickerTarget(undefined);
  };

  const restrictionMessage = restriction?.chatBanned
    ? 'You are banned from participating in chat. You can still read messages and club pings.'
    : restriction?.mutedUntil && restriction.mutedUntil.getTime() > Date.now()
      ? `You are muted until ${formatDateTime(restriction.mutedUntil, timeZone)}. You can still read chat.`
      : undefined;

  return (
    <View testID="chat-section" style={{ flex: 1, gap: theme.spacing.sm }}>
      {error ? <FeedbackBanner message={error} tone="danger" /> : null}
      {loadError ? (
        <View style={{ gap: theme.spacing.xs }}>
          <FeedbackBanner message={loadError} tone="danger" />
          <Button
            label="Retry loading chat"
            variant="secondary"
            onPress={() => {
              setLoading(true);
              setRetryRevision((revision) => revision + 1);
            }}
          />
        </View>
      ) : null}
      {feedback ? <FeedbackBanner message={feedback} tone="warning" /> : null}
      {olderError ? (
        <View style={{ gap: theme.spacing.xs }}>
          <FeedbackBanner message={olderError} tone="danger" />
          <Button
            label="Retry earlier messages"
            variant="secondary"
            loading={loadingOlder}
            onPress={() => void loadOlder()}
          />
        </View>
      ) : null}
      {restrictionMessage ? (
        <FeedbackBanner message={restrictionMessage} tone="warning" />
      ) : null}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator accessibilityLabel="Loading chat" color={theme.colors.primary} />
        </View>
      ) : (
        <FlashList
          ref={listRef}
          data={messages}
          keyExtractor={(message) => message.id}
          maintainVisibleContentPosition={{ autoscrollToTopThreshold: 0 }}
          onStartReached={() => {
            if (initiallyScrolled.current) void loadOlder();
          }}
          onStartReachedThreshold={0.15}
          onContentSizeChange={() => {
            if (!initiallyScrolled.current && messages.length) {
              initiallyScrolled.current = true;
              listRef.current?.scrollToEnd({ animated: false });
            }
          }}
          contentContainerStyle={{ paddingBottom: theme.spacing.sm }}
          ListHeaderComponent={
            loadingOlder ? (
              <ActivityIndicator
                accessibilityLabel="Loading earlier chat messages"
                color={theme.colors.primary}
                style={{ marginVertical: theme.spacing.sm }}
              />
            ) : undefined
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.xl }}>
              <AppText variant="section">No messages today</AppText>
              <AppText color="muted" style={{ textAlign: 'center' }}>
                Start the conversation or load earlier chat history.
              </AppText>
              {hasOlder ? (
                <Button
                  label="Load earlier messages"
                  variant="secondary"
                  loading={loadingOlder}
                  onPress={() => void loadOlder()}
                />
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <ChatMessageCard
              actor={actor}
              message={item}
              reactions={reactionsByMessage.get(item.id) ?? EMPTY_REACTIONS}
              formattedDate={
                messageDateFormatters[
                  item.dayKey === currentDayKey ? 'current' : 'date'
                ].format(item.createdAt)
              }
              readOnly={readOnly}
              onPress={() => !readOnly && setReactionTarget(item)}
              onModerate={() => setModerationTarget(item)}
              onReaction={(emoji) => void react(item, emoji)}
            />
          )}
        />
      )}
      <View
        style={{
          gap: theme.spacing.xs,
          paddingTop: theme.spacing.sm,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}
      >
        {canAccessRolePolicy(actor.role, roleAccessPolicies.pingClubMembers) ? (
          <ChoiceField
            appearance="plain"
            label="Ping club members"
            accessibilityLabel="Ping the whole club"
            checked={isClubPing}
            disabled={readOnly}
            trailing={(
              <RestrictedAccess
                policy={roleAccessPolicies.pingClubMembers}
                context="action"
              />
            )}
            onChange={setIsClubPing}
          />
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.xs }}>
          <IconButton
            icon="happy-outline"
            accessibilityLabel="Add emoji to message"
            disabled={readOnly}
            onPress={() => setPickerTarget({ kind: 'composer' })}
          />
          <FormTextInput
            label="Chat message"
            hideLabel
            placeholder="Message the club"
            value={draft}
            onChangeText={setDraft}
            maxLength={CHAT_MESSAGE_CHARACTER_LIMIT}
            multiline
            editable={!readOnly}
            containerStyle={{ flex: 1 }}
            style={{
              maxHeight: 120,
              minHeight: theme.layout.minTouchTarget,
            }}
          />
          <IconButton
            icon="send"
            accessibilityLabel="Send chat message"
            variant="primary"
            disabled={readOnly || sending || !draft.trim()}
            onPress={() => void send()}
          />
        </View>
        <AppText color="muted" variant="caption" style={{ textAlign: 'right' }}>
          {draft.length}/{CHAT_MESSAGE_CHARACTER_LIMIT}
        </AppText>
      </View>
      <ReactionMenu
        actor={actor}
        message={reactionTarget}
        reactions={reactionTarget
          ? reactionsByMessage.get(reactionTarget.id) ?? EMPTY_REACTIONS
          : EMPTY_REACTIONS}
        onClose={() => setReactionTarget(undefined)}
        onSelect={(emoji) => {
          if (reactionTarget) void react(reactionTarget, emoji);
          setReactionTarget(undefined);
        }}
        onMore={() => {
          if (reactionTarget) setPickerTarget({ kind: 'reaction', message: reactionTarget });
          setReactionTarget(undefined);
        }}
      />
      <ChatEmojiPickerModal
        open={Boolean(pickerTarget)}
        onClose={() => setPickerTarget(undefined)}
        onSelect={chooseEmoji}
      />
      <ChatModerationModal
        actor={actor}
        message={moderationTarget}
        onClose={() => setModerationTarget(undefined)}
        onFeedback={(message) => {
          setFeedback(message);
          setModerationTarget(undefined);
        }}
      />
    </View>
  );
};

const ChatMessageCard = ({
  actor,
  message,
  reactions,
  formattedDate,
  readOnly,
  onPress,
  onModerate,
  onReaction,
}: {
  readonly actor: User;
  readonly message: ChatMessage;
  readonly reactions: readonly ChatReaction[];
  readonly formattedDate: string;
  readonly readOnly: boolean;
  readonly onPress: () => void;
  readonly onModerate: () => void;
  readonly onReaction: (emoji: string) => void;
}) => {
  const theme = useAppTheme();
  const name = message.author?.displayName ?? 'Campus Cats member';
  const mayModerate =
    canManageFeature(actor.role) &&
    actor.id !== message.createdById &&
    message.author?.role === Role.Member;
  const grouped = aggregateReactions(reactions, actor.id);
  return (
    <View style={{ paddingVertical: theme.spacing.xs }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Message from ${name}: ${message.body}`}
        accessibilityHint={readOnly ? undefined : 'Shows message reactions'}
        onPress={onPress}
        disabled={readOnly}
        style={({ pressed }) => ({
          padding: theme.spacing.sm,
          borderRadius: theme.radii.card,
          backgroundColor: message.isClubPing
            ? theme.colors.warningSurface
            : theme.colors.surface,
          borderWidth: 1,
          borderColor: message.isClubPing
            ? theme.colors.warning
            : theme.colors.border,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.xs }}>
          <ProfileAvatar
            displayName={name}
            photoUrl={message.author?.profilePhotoUrl}
            size={40}
            fallback="initial"
            tone="primary"
          />
          <View style={{ flex: 1, gap: theme.spacing.xxs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
              <AppText variant="label" style={{ flex: 1 }}>{name}</AppText>
              {message.isClubPing ? (
                <StatusPill label="Club ping" tone="warning" icon="notifications-outline" />
              ) : null}
              {mayModerate ? (
                <IconButton
                  icon="ellipsis-horizontal"
                  accessibilityLabel={`Moderate ${name}`}
                  onPress={onModerate}
                />
              ) : null}
            </View>
            <AppText selectable>{message.body}</AppText>
            <AppText color="muted" variant="caption">
              {formattedDate}
            </AppText>
          </View>
        </View>
      </Pressable>
      {grouped.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xxs, marginTop: theme.spacing.xxs, marginLeft: 48 }}>
          {grouped.map(({ emoji, count, selected }) => (
            <Pressable
              key={emoji}
              accessibilityRole="button"
              accessibilityLabel={`${emoji} reaction, ${count}`}
              accessibilityState={{ selected, disabled: readOnly }}
              disabled={readOnly}
              onPress={() => onReaction(emoji)}
              style={{
                minHeight: 32,
                paddingHorizontal: theme.spacing.sm,
                justifyContent: 'center',
                borderRadius: theme.radii.pill,
                borderWidth: 1,
                borderColor: selected ? theme.colors.primary : theme.colors.border,
                backgroundColor: selected ? theme.colors.primarySurface : theme.colors.surface,
              }}
            >
              <AppText variant="label">{emoji} {count}</AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const ReactionMenu = ({ actor, message, reactions, onClose, onSelect, onMore }: {
  readonly actor: User;
  readonly message?: ChatMessage;
  readonly reactions: readonly ChatReaction[];
  readonly onClose: () => void;
  readonly onSelect: (emoji: string) => void;
  readonly onMore: () => void;
}) => {
  const theme = useAppTheme();
  const selected = reactions.find(({ userId }) => userId === actor.id)?.emoji;
  return (
    <Modal visible={Boolean(message)} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityLabel="Close reaction menu"
        onPress={onClose}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.overlay }}
      >
        <Pressable onPress={(event) => event.stopPropagation()}>
          <ReactionStrip
            emojis={['👍', '❤️', '👎']}
            selectedEmojis={selected ? [selected] : []}
            onEmojiSelected={({ emoji }) => onSelect(emoji)}
            onMorePress={onMore}
            colorScheme={theme.dark ? 'dark' : 'light'}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const ChatModerationModal = ({ actor, message, onClose, onFeedback }: {
  readonly actor: User;
  readonly message?: ChatMessage;
  readonly onClose: () => void;
  readonly onFeedback: (message: string) => void;
}) => {
  const theme = useAppTheme();
  const [restriction, setRestriction] = useState<ChatRestriction>();
  const [mode, setMode] = useState<'menu' | 'warning' | 'club-ban'>('menu');
  const [warning, setWarning] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const userId = message?.createdById;
  const name = message?.author?.displayName ?? 'this member';

  useEffect(() => {
    let active = true;
    setMode('menu');
    setWarning('');
    setError(undefined);
    setRestriction(undefined);
    if (!userId) return;
    void appModules.chat.getRestriction(actor, userId).then((result) => {
      if (!active) return;
      if (result.ok) setRestriction(result.value);
      else setError(result.error.message);
    });
    return () => {
      active = false;
    };
  }, [actor.id, userId]);

  const run = async (action: () => Promise<{ ok: boolean; error?: { message: string } }>, success: string) => {
    setBusy(true);
    setError(undefined);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setError(result.error?.message ?? 'The moderation action failed');
      return;
    }
    onFeedback(success);
  };

  if (!message || !userId) return null;
  return (
    <Dialog
      visible
      closeLabel="Close chat moderation"
      maxWidth={440}
      onClose={onClose}
    >
          {error ? <FeedbackBanner message={error} tone="danger" /> : null}
          {mode === 'warning' ? (
            <>
              <AppText variant="section">Warn {name}</AppText>
              <FormTextInput label="Disciplinary notice" value={warning} onChangeText={setWarning} maxLength={500} multiline />
              <Button label="Issue warning" icon="warning-outline" loading={busy} disabled={!warning.trim()} onPress={() => void run(() => appModules.users.addDisciplinaryNotice(actor, userId, warning), `Warning added for ${name}.`)} />
              <Button label="Back" variant="tertiary" onPress={() => setMode('menu')} />
            </>
          ) : mode === 'club-ban' ? (
            <>
              <AppText variant="section">Ban {name} from the club?</AppText>
              <AppText color="muted">They will be signed out and lose access to Campus Cats until an authorized officer unbans them.</AppText>
              <Button label="Ban from club" icon="ban-outline" variant="danger" loading={busy} onPress={() => void run(() => appModules.users.setBanned(actor, userId, true), `${name} has been banned from the club.`)} />
              <Button label="Cancel" variant="tertiary" onPress={() => setMode('menu')} />
            </>
          ) : (
            <>
              <AppText variant="section">Chat actions</AppText>
              <AppText color="muted">Choose an action for {name}.</AppText>
              {!restriction?.chatBanned ? (
                <Button label="Mute for 1 hour" icon="volume-mute-outline" variant="secondary" loading={busy} onPress={() => void run(() => appModules.chat.muteForOneHour(actor, userId), `${name} is muted for one hour.`)} />
              ) : null}
              <Button
                label={restriction?.chatBanned ? 'Unban from chat' : 'Ban from chat'}
                icon={restriction?.chatBanned ? 'chatbubble-outline' : 'remove-circle-outline'}
                variant={restriction?.chatBanned ? 'secondary' : 'danger'}
                loading={busy}
                onPress={() => void run(() => appModules.chat.setChatBanned(actor, userId, !restriction?.chatBanned), restriction?.chatBanned ? `${name} can participate in chat again.` : `${name} has been banned from chat.`)}
              />
              <Button label="Issue disciplinary warning" icon="warning-outline" variant="secondary" onPress={() => setMode('warning')} />
              <Button label="Ban from club" icon="ban-outline" variant="danger" onPress={() => setMode('club-ban')} />
              <Button label="Cancel chat actions" variant="tertiary" onPress={onClose} />
            </>
          )}
    </Dialog>
  );
};

const aggregateReactions = (
  reactions: readonly ChatReaction[],
  actorId: string,
) => {
  const grouped = new Map<string, { count: number; selected: boolean }>();
  for (const reaction of reactions) {
    const current = grouped.get(reaction.emoji) ?? { count: 0, selected: false };
    grouped.set(reaction.emoji, {
      count: current.count + 1,
      selected: current.selected || reaction.userId === actorId,
    });
  }
  return [...grouped.entries()].map(([emoji, value]) => ({ emoji, ...value }));
};

const EMPTY_REACTIONS: readonly ChatReaction[] = Object.freeze([]);

const formatDateTime = (date: Date, timeZone: string): string =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(date);
