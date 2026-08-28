import React from 'react';
import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';

import {
  Role,
  chatDayKey,
  parseChatDay,
  parseChatMessage,
  parseChatRestriction,
  parsePublicProfile,
  parseUser,
} from '../../core/domain';
import { AppThemeProvider } from '../../theme';
import { ChatSection } from './ChatSection';

const mockObserveDay = jest.fn();
const mockLoadDay = jest.fn();
const mockFindPreviousActiveDay = jest.fn();
const mockSendMessage = jest.fn();
const mockSetReaction = jest.fn();
const mockObserveRestriction = jest.fn();
const mockObserveUnreadPing = jest.fn();
const mockMarkPingsRead = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../../composition/appModules', () => ({
  appModules: {
    chat: {
      observeDay: (...args: unknown[]) => mockObserveDay(...args),
      loadDay: (...args: unknown[]) => mockLoadDay(...args),
      findPreviousActiveDay: (...args: unknown[]) => mockFindPreviousActiveDay(...args),
      sendMessage: (...args: unknown[]) => mockSendMessage(...args),
      setReaction: (...args: unknown[]) => mockSetReaction(...args),
      observeCurrentRestriction: (...args: unknown[]) => mockObserveRestriction(...args),
      observeUnreadPing: (...args: unknown[]) => mockObserveUnreadPing(...args),
      markPingsRead: (...args: unknown[]) => mockMarkPingsRead(...args),
      getRestriction: jest.fn().mockResolvedValue({ ok: true, value: undefined, warnings: [] }),
      muteForOneHour: jest.fn(),
      setChatBanned: jest.fn(),
    },
    users: { addDisciplinaryNotice: jest.fn(), setBanned: jest.fn() },
  },
}));

jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockFlashList = React.forwardRef(
      ({ data, renderItem, ListHeaderComponent, ListEmptyComponent, onContentSizeChange }: any, ref: any) => {
        React.useImperativeHandle(ref, () => ({ scrollToEnd: jest.fn() }));
        React.useEffect(() => onContentSizeChange?.(), [data.length]);
        return (
          <View>
            {ListHeaderComponent}
            {data.length
              ? data.map((item: unknown, index: number) => (
                  <View key={(item as { id: string }).id}>{renderItem({ item, index })}</View>
                ))
              : ListEmptyComponent}
          </View>
        );
      },
    );
  MockFlashList.displayName = 'MockFlashList';
  return { FlashList: MockFlashList };
});

jest.mock('@softwhere-uz/react-native-emoji-keyboard', () => {
  const mockReact = require('react');
  const {
    View: MockView,
    Pressable: MockPressable,
    Text: MockText,
  } = require('react-native');
  return {
    ReactionStrip: ({ emojis, onEmojiSelected, onMorePress }: any) =>
      mockReact.createElement(
        MockView,
        null,
        ...emojis.map((emoji: string) =>
          mockReact.createElement(
            MockPressable,
            {
              key: emoji,
              accessibilityRole: 'button',
              accessibilityLabel: `React ${emoji}`,
              onPress: () => onEmojiSelected({ emoji }),
            },
            mockReact.createElement(MockText, null, emoji),
          ),
        ),
        mockReact.createElement(
          MockPressable,
          { accessibilityRole: 'button', accessibilityLabel: 'More reactions', onPress: onMorePress },
          mockReact.createElement(MockText, null, '+'),
        ),
      ),
    EmojiModal: ({ open, children }: any) =>
      open ? mockReact.createElement(MockView, null, children) : null,
    EmojiKeyboard: () => null,
  };
});

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const actor = parseUser({
  id: 'member-1',
  email: 'member@example.com',
  role: Role.Member,
});
const officer = parseUser({
  id: 'officer-1',
  email: 'officer@example.com',
  role: Role.Officer,
});
const timeZone = 'America/New_York';

const renderChat = async (activeActor = actor) =>
  await render(
    <AppThemeProvider colorScheme="light">
      <ChatSection actor={activeActor} timeZone={timeZone} />
    </AppThemeProvider>,
  );

describe('ChatSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const dayKey = chatDayKey(new Date(), timeZone);
    const message = parseChatMessage({
      id: 'message-1',
      body: 'Welcome to today’s chat 😺',
      createdById: 'member-2',
      createdAt: new Date(),
      dayKey,
      isClubPing: false,
      author: parsePublicProfile({
        id: 'member-2',
        displayName: 'Mina Member',
        role: Role.Member,
      }),
    });
    mockObserveDay.mockImplementation(
      (_actor: unknown, requestedDay: string, observer: (result: unknown) => void) => {
        observer({
          ok: true,
          value: requestedDay === dayKey
            ? parseChatDay({ dayKey, messages: [message], reactions: [] })
            : parseChatDay({ dayKey: requestedDay, messages: [], reactions: [] }),
          warnings: [],
        });
        return jest.fn();
      },
    );
    mockObserveRestriction.mockImplementation(
      (_actor: unknown, observer: (result: unknown) => void) => {
        observer({ ok: true, value: undefined, warnings: [] });
        return jest.fn();
      },
    );
    mockObserveUnreadPing.mockImplementation(
      (_actor: unknown, observer: (result: unknown) => void) => {
        observer({ ok: true, value: { unread: false }, warnings: [] });
        return jest.fn();
      },
    );
    mockFindPreviousActiveDay.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
    mockLoadDay.mockImplementation(
      (_actor: unknown, requestedDay: string) =>
        Promise.resolve({
          ok: true,
          value: parseChatDay({ dayKey: requestedDay, messages: [], reactions: [] }),
          warnings: [],
        }),
    );
    mockSendMessage.mockResolvedValue({ ok: true, value: message, warnings: [] });
    mockSetReaction.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
  });

  it('shows today’s messages, sends emoji text, and reacts from the quick picker', async () => {
    const user = userEvent.setup();
    await renderChat();
    expect(await screen.findByText('Welcome to today’s chat 😺')).toBeOnTheScreen();

    const input = screen.getByLabelText('Chat message');
    fireEvent.changeText(input, 'Hello 😸');
    await waitFor(() => expect(input).toHaveProp('value', 'Hello 😸'));
    await user.press(screen.getByRole('button', { name: 'Send chat message' }));
    await waitFor(() =>
      expect(mockSendMessage).toHaveBeenCalledWith(actor, 'Hello 😸', false),
    );

    await user.press(screen.getByRole('button', { name: /Message from Mina Member/ }));
    await user.press(screen.getByRole('button', { name: 'React 👍' }));
    expect(mockSetReaction).toHaveBeenCalledWith(
      actor,
      'message-1',
      expect.any(String),
      '👍',
    );
    expect(
      await screen.findByRole('button', { name: '👍 reaction, 1' }),
    ).toBeOnTheScreen();
  });

  it('keeps chat readable but disables composing while banned', async () => {
    mockObserveRestriction.mockImplementation(
      (_actor: unknown, observer: (result: unknown) => void) => {
        observer({
          ok: true,
          value: parseChatRestriction({
            userId: actor.id,
            chatBanned: true,
            updatedAt: new Date(),
            updatedById: 'officer-1',
          }),
          warnings: [],
        });
        return jest.fn();
      },
    );
    await renderChat();
    expect(await screen.findByText(/banned from participating in chat/i)).toBeOnTheScreen();
    await waitFor(() =>
      expect(screen.getByLabelText('Chat message')).toHaveProp('editable', false),
    );
    expect(screen.getByText('Welcome to today’s chat 😺')).toBeOnTheScreen();
  });

  it('marks pings read while open and offers a deterministic history retry', async () => {
    const dayKey = chatDayKey(new Date(), timeZone);
    mockObserveDay.mockImplementation(
      (_actor: unknown, requestedDay: string, observer: (result: unknown) => void) => {
        observer({
          ok: true,
          value: parseChatDay({ dayKey: requestedDay, messages: [], reactions: [] }),
          warnings: [],
        });
        return jest.fn();
      },
    );
    mockObserveUnreadPing.mockImplementation(
      (_actor: unknown, observer: (result: unknown) => void) => {
        observer({ ok: true, value: { unread: true }, warnings: [] });
        return jest.fn();
      },
    );
    mockFindPreviousActiveDay.mockResolvedValue({
      ok: false,
      error: { code: 'dependency_failure', message: 'History unavailable' },
    });
    await renderChat();
    expect(mockMarkPingsRead).toHaveBeenCalledWith(actor);
    expect(screen.getByText('No messages today')).toBeOnTheScreen();
    await userEvent.press(
      screen.getByRole('button', { name: 'Load earlier messages' }),
    );
    expect(await screen.findByText('History unavailable')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Retry earlier messages' }),
    ).toBeOnTheScreen();
    expect(mockFindPreviousActiveDay).toHaveBeenCalledWith(actor, dayKey);
  });

  it('loads historical days once instead of retaining another live subscription', async () => {
    const currentDay = chatDayKey(new Date(), timeZone);
    const previousDay = '2025-01-01';
    mockObserveDay.mockImplementation(
      (_actor: unknown, requestedDay: string, observer: (result: unknown) => void) => {
        observer({
          ok: true,
          value: parseChatDay({ dayKey: requestedDay, messages: [], reactions: [] }),
          warnings: [],
        });
        return jest.fn();
      },
    );
    mockFindPreviousActiveDay.mockResolvedValue({
      ok: true,
      value: previousDay,
      warnings: [],
    });

    await renderChat();
    await userEvent.press(
      screen.getByRole('button', { name: 'Load earlier messages' }),
    );

    await waitFor(() =>
      expect(mockLoadDay).toHaveBeenCalledWith(actor, previousDay),
    );
    expect(mockObserveDay).toHaveBeenCalledTimes(1);
    expect(mockObserveDay).toHaveBeenCalledWith(
      actor,
      currentDay,
      expect.any(Function),
    );
  });

  it('marks the club-wide ping control as officer-only', async () => {
    const user = userEvent.setup();
    await renderChat(officer);

    expect(
      screen.getByRole('checkbox', { name: 'Ping the whole club' }),
    ).toBeOnTheScreen();
    await user.press(
      screen.getByRole('button', { name: 'Explain officer-only access' }),
    );
    expect(screen.getByText('Officer-only action')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Officer-level access is required to ping all club members.',
      ),
    ).toBeOnTheScreen();
  });
});
