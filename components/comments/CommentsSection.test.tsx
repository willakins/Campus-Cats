import React from 'react';

import {
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from '@testing-library/react-native';

import {
  Role,
  parseComment,
  parsePublicProfile,
  parseUser,
} from '../../core/domain';
import { AppThemeProvider, lightTheme } from '../../theme';
import { CommentsSection } from './CommentsSection';

const mockList = jest.fn();
const mockCreate = jest.fn();
const mockRemove = jest.fn();
const mockWarn = jest.fn();
const mockBan = jest.fn();

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../composition/appModules', () => ({
  appModules: {
    comments: {
      list: (...args: unknown[]) => mockList(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      remove: (...args: unknown[]) => mockRemove(...args),
    },
    users: {
      addDisciplinaryNotice: (...args: unknown[]) => mockWarn(...args),
      setBanned: (...args: unknown[]) => mockBan(...args),
    },
  },
}));

const actor = parseUser({
  id: 'officer-1',
  email: 'officer@gatech.edu',
  role: Role.Officer,
});
const member = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});
const author = parsePublicProfile({
  id: member.id,
  displayName: 'Member One',
  bio: '',
  profilePhotoUrl: '',
  role: Role.Member,
  achievementIds: [],
  selectedTitleId: '',
});
const target = { kind: 'sighting' as const, id: 'sighting-1' };
const existingComment = parseComment({
  id: 'comment-1',
  target,
  body: 'Goldie was here this morning.',
  createdAt: new Date('2026-08-20T12:00:00.000Z'),
  createdById: member.id,
  author,
});

describe('CommentsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockList.mockResolvedValue({
      ok: true,
      value: [existingComment],
      warnings: [],
    });
    mockCreate.mockResolvedValue({
      ok: true,
      value: parseComment({
        id: 'comment-2',
        target,
        body: 'Thanks for the update!',
        createdAt: new Date('2026-08-20T12:30:00.000Z'),
        createdById: actor.id,
      }),
      warnings: [],
    });
    mockWarn.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
    mockBan.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
    mockRemove.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
  });

  it('separates the comments card from the content above it', async () => {
    await render(
      <AppThemeProvider colorScheme="light">
        <CommentsSection actor={actor} target={target} />
      </AppThemeProvider>,
    );

    expect(screen.getByTestId('comments-section')).toHaveStyle({
      marginTop: lightTheme.spacing.md,
    });
  });

  it('loads the thread and lets the signed-in user post a comment', async () => {
    const user = userEvent.setup();
    await render(
      <AppThemeProvider colorScheme="light">
        <CommentsSection actor={actor} target={target} />
      </AppThemeProvider>,
    );

    expect(await screen.findByText('Goldie was here this morning.')).toBeOnTheScreen();
    expect(screen.getByText('Member One')).toBeOnTheScreen();

    await fireEvent.changeText(
      screen.getByLabelText('Add a comment'),
      'Thanks for the update!',
    );
    await user.press(screen.getByRole('button', { name: 'Post comment' }));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        actor,
        target,
        'Thanks for the update!',
      ),
    );
    expect(screen.getByText('Thanks for the update!')).toBeOnTheScreen();
    expect(screen.getByLabelText('Add a comment')).toHaveProp('value', '');
  });

  it('limits Campus Cats comment input to 300 characters', async () => {
    await render(
      <AppThemeProvider colorScheme="light">
        <CommentsSection actor={actor} target={target} />
      </AppThemeProvider>,
    );

    expect(screen.getByLabelText('Add a comment')).toHaveProp('maxLength', 300);
  });

  it('lets an officer open comment actions and issue a warning', async () => {
    const user = userEvent.setup();
    await render(
      <AppThemeProvider colorScheme="light">
        <CommentsSection actor={actor} target={target} />
      </AppThemeProvider>,
    );

    await user.press(
      await screen.findByRole('button', {
        name: 'More actions for comment by Member One',
      }),
    );
    await user.press(screen.getByRole('button', { name: 'Warn user' }));
    await fireEvent.changeText(
      screen.getByLabelText('Disciplinary notice'),
      'Please keep comments respectful.',
    );
    await user.press(screen.getByRole('button', { name: 'Issue warning' }));

    await waitFor(() =>
      expect(mockWarn).toHaveBeenCalledWith(
        actor,
        member.id,
        'Please keep comments respectful.',
      ),
    );
    expect(await screen.findByText('Warning added for Member One.')).toBeOnTheScreen();
  });

  it('lets an officer confirm an account-wide ban from a comment', async () => {
    const user = userEvent.setup();
    await render(
      <AppThemeProvider colorScheme="light">
        <CommentsSection actor={actor} target={target} />
      </AppThemeProvider>,
    );

    await user.press(
      await screen.findByRole('button', {
        name: 'More actions for comment by Member One',
      }),
    );
    await user.press(screen.getByRole('button', { name: 'Ban user' }));
    expect(screen.getByText('Ban user?')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Ban user' }));

    await waitFor(() => expect(mockBan).toHaveBeenCalledWith(actor, member.id, true));
    expect(await screen.findByText('Member One has been banned.')).toBeOnTheScreen();
  });

  it('lets an officer confirm comment deletion', async () => {
    const user = userEvent.setup();
    await render(
      <AppThemeProvider colorScheme="light">
        <CommentsSection actor={actor} target={target} />
      </AppThemeProvider>,
    );

    await user.press(
      await screen.findByRole('button', {
        name: 'More actions for comment by Member One',
      }),
    );
    await user.press(screen.getByRole('button', { name: 'Delete comment' }));
    expect(screen.getByText('Delete comment?')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Delete comment' }));

    await waitFor(() =>
      expect(mockRemove).toHaveBeenCalledWith(actor, target, 'comment-1'),
    );
    expect(screen.queryByText('Goldie was here this morning.')).not.toBeOnTheScreen();
    expect(await screen.findByText('Comment deleted.')).toBeOnTheScreen();
  });

  it('keeps a failed warning visible in the action dialog', async () => {
    mockWarn.mockResolvedValue({
      ok: false,
      error: { code: 'dependency_failure', message: 'Could not add warning' },
    });
    const user = userEvent.setup();
    await render(
      <AppThemeProvider colorScheme="light">
        <CommentsSection actor={actor} target={target} />
      </AppThemeProvider>,
    );

    await user.press(
      await screen.findByRole('button', {
        name: 'More actions for comment by Member One',
      }),
    );
    await user.press(screen.getByRole('button', { name: 'Warn user' }));
    await fireEvent.changeText(
      screen.getByLabelText('Disciplinary notice'),
      'Please keep comments respectful.',
    );
    await user.press(screen.getByRole('button', { name: 'Issue warning' }));

    expect(await screen.findByText('Could not add warning')).toBeOnTheScreen();
    expect(screen.getByLabelText('Disciplinary notice')).toBeOnTheScreen();
  });

  it('clears the previous thread before reporting a new target load failure', async () => {
    const view = await render(
      <AppThemeProvider colorScheme="light">
        <CommentsSection actor={actor} target={target} />
      </AppThemeProvider>,
    );
    expect(await screen.findByText('Goldie was here this morning.')).toBeOnTheScreen();
    mockList.mockResolvedValueOnce({
      ok: false,
      error: { code: 'dependency_failure', message: 'Could not load comments' },
    });

    await view.rerender(
      <AppThemeProvider colorScheme="light">
        <CommentsSection
          actor={actor}
          target={{ kind: 'catalog', id: 'catalog-2' }}
        />
      </AppThemeProvider>,
    );

    expect(await screen.findByText('Could not load comments')).toBeOnTheScreen();
    expect(screen.queryByText('Goldie was here this morning.')).not.toBeOnTheScreen();
  });

  it('does not show moderation actions to members', async () => {
    await render(
      <AppThemeProvider colorScheme="light">
        <CommentsSection actor={member} target={target} />
      </AppThemeProvider>,
    );

    expect(await screen.findByText('Goldie was here this morning.')).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', {
        name: 'More actions for comment by Member One',
      }),
    ).not.toBeOnTheScreen();
  });

  it('keeps discipline actions available when an author profile is missing', async () => {
    mockList.mockResolvedValue({
      ok: true,
      value: [{ ...existingComment, author: undefined }],
      warnings: [],
    });
    const user = userEvent.setup();
    await render(
      <AppThemeProvider colorScheme="light">
        <CommentsSection actor={actor} target={target} />
      </AppThemeProvider>,
    );

    await user.press(
      await screen.findByRole('button', {
        name: 'More actions for comment by Campus Cats member',
      }),
    );
    expect(screen.getByRole('button', { name: 'Warn user' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ban user' })).toBeOnTheScreen();
  });

  it('attributes imported comments to iNaturalist without local discipline actions', async () => {
    mockList.mockResolvedValue({
      ok: true,
      value: [
        parseComment({
          id: 'inat-comment-source-uuid',
          target: { kind: 'sighting', id: 'inat-observation-321' },
          body: 'Pretty sure this is Charles!',
          createdAt: new Date('2026-08-11T02:53:45.000Z'),
          source: 'inaturalist',
          sourceCommentId: 22894482,
          sourceCommentUuid: 'e221e4fd-b34c-43ec-b21a-e36c1ba327d7',
          sourceUrl:
            'https://www.inaturalist.org/observations/321#comment-22894482',
          sourceUpdatedAt: new Date('2026-08-11T02:53:45.000Z'),
          lastSeenRunId: 'run-1',
          externalAuthor: {
            id: 8358607,
            login: 'chipmunkt',
            displayName: 'Chip Munk',
            sourceUrl: 'https://www.inaturalist.org/people/chipmunkt',
          },
        }),
      ],
      warnings: [],
    });
    const user = userEvent.setup();
    await render(
      <AppThemeProvider colorScheme="light">
        <CommentsSection
          actor={actor}
          target={{ kind: 'sighting', id: 'inat-observation-321' }}
        />
      </AppThemeProvider>,
    );

    expect(await screen.findByText('Chip Munk')).toBeOnTheScreen();
    expect(screen.getByText('iNaturalist')).toBeOnTheScreen();
    expect(
      screen.getByRole('link', { name: 'View comment on iNaturalist' }),
    ).toBeOnTheScreen();
    await user.press(
      screen.getByRole('button', {
        name: 'More actions for comment by Chip Munk',
      }),
    );
    expect(
      screen.getByRole('button', { name: 'Delete comment' }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Warn user' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Ban user' })).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Delete comment' }));
    expect(
      screen.getByText(
        'This hides the Campus Cats copy. The source comment remains on iNaturalist.',
      ),
    ).toBeOnTheScreen();
  });
});
