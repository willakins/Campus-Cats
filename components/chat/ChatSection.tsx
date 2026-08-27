import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { ReactionStrip } from '@softwhere-uz/react-native-emoji-keyboard';

import {
  AppText,
  Button,
  FeedbackBanner,
  IconButton,
  StatusPill,
} from '@/components/design';
import { FormTextInput } from '@/components/forms';
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
  canManageFeature,
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
    const stops = dayKeys.map((dayKey) =>
      appModules.chat.observeDay(actor, dayKey, (result) => {
        if (!result.ok) {
          setLoadError(result.error.message);
          setLoading(false);
          setLoadingOlder(false);
          return;
        }
        setDays((current) => {
          const next = new Map(current);
          next.set(dayKey, result.value);
          return next;
        });
        setLoading(false);
        setLoadingOlder(false);
      }),
    );
    return () => stops.forEach((stop) => stop());
  }, [actor.id, dayKeys.join('|'), retryRevision]);

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
  const readOnly = chatRestrictionActive(restriction, now);

  const loadOlder = async () => {
    if (loading || loadingOlder || !hasOlder) return;
    setLoadingOlder(true);
    setOlderError(undefined);
    const oldest = [...dayKeys].sort()[0] ?? currentDayKey;
    const result = await appModules.chat.findPreviousActiveDay(actor, oldest);
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
    setDayKeys((current) =>
      [...new Set([...current, result.value as string])].sort(),
    );
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
    setSending(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setDraft('');
    setIsClubPing(false);
    setFeedback(result.warnings[0]?.message);
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  const react = async (message: ChatMessage, emoji: string) => {
    setError(undefined);
    const result = await appModules.chat.setReaction(
      actor,
      message.id,
      message.dayKey,
      emoji,
    );
    if (!result.ok) setError(result.error.message);
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
              reactions={reactions.filter(({ messageId }) => messageId === item.id)}
              currentDayKey={currentDayKey}
              timeZone={timeZone}
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
        {canManageFeature(actor.role) ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="Ping the whole club"
            accessibilityState={{ checked: isClubPing, disabled: readOnly }}
            disabled={readOnly}
            onPress={() => setIsClubPing((value) => !value)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}
          >
            <Ionicons
              name={isClubPing ? 'checkbox' : 'square-outline'}
              size={22}
              color={theme.colors.primary}
            />
            <AppText variant="label">Ping club members</AppText>
          </Pressable>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.xs }}>
          <IconButton
            icon="happy-outline"
            accessibilityLabel="Add emoji to message"
            disabled={readOnly}
            onPress={() => setPickerTarget({ kind: 'composer' })}
          />
          <TextInput
            accessibilityLabel="Chat message"
            placeholder="Message the club"
            placeholderTextColor={theme.colors.textMuted}
            value={draft}
            onChangeText={setDraft}
            maxLength={CHAT_MESSAGE_CHARACTER_LIMIT}
            multiline
            editable={!readOnly}
            style={[
              theme.typography.body,
              {
                flex: 1,
                maxHeight: 120,
                minHeight: theme.layout.minTouchTarget,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.xs,
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radii.field,
              },
            ]}
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
        reactions={reactionTarget ? reactions.filter(({ messageId }) => messageId === reactionTarget.id) : []}
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
  currentDayKey,
  timeZone,
  readOnly,
  onPress,
  onModerate,
  onReaction,
}: {
  readonly actor: User;
  readonly message: ChatMessage;
  readonly reactions: readonly ChatReaction[];
  readonly currentDayKey: string;
  readonly timeZone: string;
  readonly readOnly: boolean;
  readonly onPress: () => void;
  readonly onModerate: () => void;
  readonly onReaction: (emoji: string) => void;
}) => {
  const theme = useAppTheme();
  const name = message.author?.displayName ?? 'Campus Cats member';
  const initial = name.charAt(0).toLocaleUpperCase() || '?';
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
          {message.author?.profilePhotoUrl ? (
            <Image
              source={{ uri: message.author.profilePhotoUrl }}
              accessibilityLabel={`${name}'s profile photo`}
              style={{ width: 40, height: 40, borderRadius: theme.radii.pill }}
            />
          ) : (
            <View
              accessibilityLabel={`${name}'s profile placeholder`}
              style={{
                width: 40,
                height: 40,
                borderRadius: theme.radii.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.primarySurface,
              }}
            >
              <AppText variant="label" color="primary">{initial}</AppText>
            </View>
          )}
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
              {formatMessageDate(message, currentDayKey, timeZone)}
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
    setMode('menu');
    setWarning('');
    setError(undefined);
    setRestriction(undefined);
    if (!userId) return;
    void appModules.chat.getRestriction(actor, userId).then((result) => {
      if (result.ok) setRestriction(result.value);
      else setError(result.error.message);
    });
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
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg }}>
        <Pressable accessibilityLabel="Close chat moderation" onPress={onClose} style={{ position: 'absolute', inset: 0, backgroundColor: theme.colors.overlay }} />
        <View style={{ width: '100%', maxWidth: 440, gap: theme.spacing.sm, padding: theme.spacing.md, borderRadius: theme.radii.sheet, backgroundColor: theme.colors.surface }}>
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
        </View>
      </View>
    </Modal>
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

const formatMessageDate = (
  message: ChatMessage,
  currentDayKey: string,
  timeZone: string,
): string =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    ...(message.dayKey === currentDayKey ? { timeStyle: 'short' as const } : {}),
    timeZone,
  }).format(message.createdAt);

const formatDateTime = (date: Date, timeZone: string): string =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(date);
