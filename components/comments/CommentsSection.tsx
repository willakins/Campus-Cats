import React, { useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { appModules } from '@/composition/appModules';
import {
  COMMENT_CHARACTER_LIMIT,
  Comment,
  CommentTarget,
  User,
  canManageFeature,
} from '@/core/domain';
import { useAppTheme } from '@/theme';

import {
  AppText,
  Button,
  Card,
  Dialog,
  FeedbackBanner,
  FormSection,
  IconButton,
  Skeleton,
} from '../design';
import { FormTextInput } from '../forms';
import { ProfileAvatar } from '../profile';
import { IncrementalHistoryList } from '../collections/IncrementalHistoryList';

interface CommentsSectionProps {
  readonly actor: User;
  readonly target: CommentTarget;
}

type CommentActionResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

export const CommentsSection = ({ actor, target }: CommentsSectionProps) => {
  const theme = useAppTheme();
  const [comments, setComments] = useState<readonly Comment[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string>();
  const [error, setError] = useState<string>();
  const [feedback, setFeedback] = useState<{
    readonly message: string;
    readonly tone: 'success' | 'danger';
  }>();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setComments([]);
    setError(undefined);
    setFeedback(undefined);
    void appModules.comments.list(actor, target).then((result) => {
      if (!active) return;
      if (result.ok) setComments(result.value);
      else setError(result.error.message);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [actor.id, target.id, target.kind]);

  const post = async () => {
    if (posting || !draft.trim()) return;
    setPosting(true);
    setError(undefined);
    const result = await appModules.comments.create(actor, target, draft);
    setPosting(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setComments((current) => [...current, result.value]);
    setDraft('');
  };

  const remove = async (comment: Comment): Promise<CommentActionResult> => {
    if (actionBusyId) {
      return { ok: false, message: 'Another action is in progress' };
    }
    setActionBusyId(comment.id);
    setFeedback(undefined);
    const result = await appModules.comments.remove(
      actor,
      comment.target,
      comment.id,
    );
    setActionBusyId(undefined);
    if (!result.ok) {
      return { ok: false, message: result.error.message };
    }
    setComments((current) => current.filter(({ id }) => id !== comment.id));
    setFeedback({ message: 'Comment deleted.', tone: 'success' });
    return { ok: true };
  };

  const warn = async (
    comment: Comment,
    message: string,
  ): Promise<CommentActionResult> => {
    if (!comment.createdById || comment.source !== 'campus-cats') {
      return {
        ok: false,
        message: 'Imported comment authors cannot be disciplined here',
      };
    }
    if (actionBusyId) {
      return { ok: false, message: 'Another action is in progress' };
    }
    setActionBusyId(comment.id);
    setFeedback(undefined);
    const result = await appModules.users.addDisciplinaryNotice(
      actor,
      comment.createdById,
      message,
    );
    setActionBusyId(undefined);
    if (!result.ok) {
      return { ok: false, message: result.error.message };
    }
    const authorName = comment.author?.displayName ?? 'Campus Cats member';
    setFeedback({
      message: `Warning added for ${authorName}.`,
      tone: 'success',
    });
    return { ok: true };
  };

  const ban = async (comment: Comment): Promise<CommentActionResult> => {
    if (!comment.createdById || comment.source !== 'campus-cats') {
      return {
        ok: false,
        message: 'Imported comment authors cannot be disciplined here',
      };
    }
    if (actionBusyId) {
      return { ok: false, message: 'Another action is in progress' };
    }
    setActionBusyId(comment.id);
    setFeedback(undefined);
    const result = await appModules.users.setBanned(
      actor,
      comment.createdById,
      true,
    );
    setActionBusyId(undefined);
    if (!result.ok) {
      return { ok: false, message: result.error.message };
    }
    const authorName = comment.author?.displayName ?? 'Campus Cats member';
    setFeedback({ message: `${authorName} has been banned.`, tone: 'success' });
    return { ok: true };
  };

  return (
    <View testID="comments-section" style={{ marginTop: theme.spacing.md }}>
      <FormSection title="Comments">
        <View style={{ gap: theme.spacing.xs }}>
          <FormTextInput
            label="Add a comment"
            placeholder="Share an update or observation"
            value={draft}
            onChangeText={setDraft}
            maxLength={COMMENT_CHARACTER_LIMIT}
            multiline
          />
          <Button
            label="Post comment"
            icon="send-outline"
            loading={posting}
            loadingLabel="Posting…"
            disabled={!draft.trim()}
            onPress={() => void post()}
            style={{ alignSelf: 'flex-start' }}
          />
        </View>
        {error ? <FeedbackBanner message={error} tone="danger" /> : null}
        {feedback ? (
          <FeedbackBanner message={feedback.message} tone={feedback.tone} />
        ) : null}
        {loading ? (
          <Skeleton label="Loading comments" height={96} />
        ) : comments.length === 0 ? (
          <AppText color="muted">No comments yet. Start the conversation.</AppText>
        ) : (
          <IncrementalHistoryList
            items={comments}
            itemName="comments"
            resetKey={`${target.kind}:${target.id}`}
            keyExtractor={(comment) => comment.id}
            renderItem={(comment) => (
              <CommentCard
                actor={actor}
                comment={comment}
                busy={actionBusyId === comment.id}
                onDelete={() => remove(comment)}
                onWarn={(message) => warn(comment, message)}
                onBan={() => ban(comment)}
              />
            )}
          />
        )}
      </FormSection>
    </View>
  );
};

interface CommentCardProps {
  readonly actor: User;
  readonly comment: Comment;
  readonly busy: boolean;
  readonly onDelete: () => Promise<CommentActionResult>;
  readonly onWarn: (message: string) => Promise<CommentActionResult>;
  readonly onBan: () => Promise<CommentActionResult>;
}

const CommentCard = ({
  actor,
  comment,
  busy,
  onDelete,
  onWarn,
  onBan,
}: CommentCardProps) => {
  const theme = useAppTheme();
  const [actionsOpen, setActionsOpen] = useState(false);
  const imported = comment.source === 'inaturalist';
  const authorName = imported
    ? comment.externalAuthor?.displayName ??
      (comment.externalAuthor ? `@${comment.externalAuthor.login}` : 'iNaturalist user')
    : comment.author?.displayName ?? 'Campus Cats member';
  const profilePhotoUrl = imported ? undefined : comment.author?.profilePhotoUrl;
  const sourceUrl = comment.sourceUrl;
  const mayModerate = canManageFeature(actor.role);
  const mayDiscipline =
    mayModerate &&
    !imported &&
    Boolean(comment.createdById) &&
    actor.id !== comment.createdById;
  return (
    <>
      <Card style={{ padding: theme.spacing.sm }}>
        <View style={{ gap: theme.spacing.xs }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.xs,
            }}
          >
            <ProfileAvatar
              displayName={authorName}
              photoUrl={profilePhotoUrl}
              size={36}
              fallback="initial"
              tone="primary"
            />
            <View style={{ flex: 1 }}>
              <AppText variant="label">{authorName}</AppText>
              {imported && sourceUrl ? (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="View comment on iNaturalist"
                  onPress={() => void Linking.openURL(sourceUrl)}
                >
                  <AppText color="primary" variant="caption">
                    iNaturalist
                  </AppText>
                </Pressable>
              ) : null}
              <AppText color="muted" variant="caption">
                {comment.createdAt.toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </AppText>
            </View>
            {mayModerate ? (
              <IconButton
                icon="ellipsis-horizontal"
                accessibilityLabel={`More actions for comment by ${authorName}`}
                disabled={busy}
                onPress={() => setActionsOpen(true)}
              />
            ) : null}
          </View>
          <AppText selectable>{comment.body}</AppText>
        </View>
      </Card>
      <CommentActionsMenu
        visible={actionsOpen}
        authorName={authorName}
        busy={busy}
        imported={imported}
        mayDiscipline={mayDiscipline}
        onClose={() => setActionsOpen(false)}
        onDelete={onDelete}
        onWarn={onWarn}
        onBan={onBan}
      />
    </>
  );
};

interface CommentActionsMenuProps {
  readonly visible: boolean;
  readonly authorName: string;
  readonly busy: boolean;
  readonly imported: boolean;
  readonly mayDiscipline: boolean;
  readonly onClose: () => void;
  readonly onDelete: () => Promise<CommentActionResult>;
  readonly onWarn: (message: string) => Promise<CommentActionResult>;
  readonly onBan: () => Promise<CommentActionResult>;
}

const CommentActionsMenu = ({
  visible,
  authorName,
  busy,
  imported,
  mayDiscipline,
  onClose,
  onDelete,
  onWarn,
  onBan,
}: CommentActionsMenuProps) => {
  const theme = useAppTheme();
  const [warningOpen, setWarningOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<'delete' | 'ban'>();
  const [warning, setWarning] = useState('');
  const [actionError, setActionError] = useState<string>();

  const close = () => {
    setWarningOpen(false);
    setConfirmation(undefined);
    setWarning('');
    setActionError(undefined);
    onClose();
  };

  const issueWarning = async () => {
    if (!warning.trim()) return;
    setActionError(undefined);
    const result = await onWarn(warning);
    if (result.ok) close();
    else setActionError(result.message);
  };

  const confirmAction = async () => {
    if (!confirmation) return;
    setActionError(undefined);
    const result = await (confirmation === 'delete' ? onDelete() : onBan());
    if (result.ok) close();
    else setActionError(result.message);
  };

  return (
    <Dialog
      visible={visible}
      closeLabel="Close comment actions"
      onClose={close}
    >
          {actionError ? (
            <FeedbackBanner message={actionError} tone="danger" />
          ) : null}
          {confirmation ? (
            <>
              <AppText variant="section">
                {confirmation === 'delete' ? 'Delete comment?' : 'Ban user?'}
              </AppText>
              <AppText color="muted">
                {confirmation === 'delete'
                  ? imported
                    ? 'This hides the Campus Cats copy. The source comment remains on iNaturalist.'
                    : 'This comment will be permanently removed.'
                  : `${authorName} will be signed out and unable to access Campus Cats until an authorized officer unbans them.`}
              </AppText>
              <Button
                label={confirmation === 'delete' ? 'Delete comment' : 'Ban user'}
                icon={confirmation === 'delete' ? 'trash-outline' : 'ban-outline'}
                variant="danger"
                loading={busy}
                onPress={() => void confirmAction()}
              />
              <Button
                label="Cancel confirmation"
                variant="tertiary"
                disabled={busy}
                onPress={() => {
                  setActionError(undefined);
                  setConfirmation(undefined);
                }}
              />
            </>
          ) : warningOpen ? (
            <>
              <AppText variant="section">Warn user</AppText>
              <AppText color="muted">
                Add a reason to {authorName}&apos;s moderation history.
              </AppText>
              <FormTextInput
                label="Disciplinary notice"
                placeholder="Describe the policy violation"
                value={warning}
                onChangeText={setWarning}
                maxLength={500}
                multiline
              />
              <Button
                label="Issue warning"
                icon="warning-outline"
                loading={busy}
                disabled={!warning.trim()}
                onPress={() => void issueWarning()}
              />
              <Button
                label="Cancel warning"
                variant="tertiary"
                disabled={busy}
                onPress={() => {
                  setWarning('');
                  setActionError(undefined);
                  setWarningOpen(false);
                }}
              />
            </>
          ) : (
            <>
              <AppText variant="section">Comment actions</AppText>
              <AppText color="muted">Choose an action for {authorName}.</AppText>
              <Button
                label="Delete comment"
                icon="trash-outline"
                variant="danger"
                disabled={busy}
                onPress={() => setConfirmation('delete')}
              />
              {mayDiscipline ? (
                <>
                  <Button
                    label="Warn user"
                    icon="warning-outline"
                    variant="secondary"
                    disabled={busy}
                    onPress={() => setWarningOpen(true)}
                  />
                  <Button
                    label="Ban user"
                    icon="ban-outline"
                    variant="danger"
                    disabled={busy}
                    onPress={() => setConfirmation('ban')}
                  />
                </>
              ) : null}
              <Button
                label="Cancel comment actions"
                variant="tertiary"
                disabled={busy}
                onPress={close}
              />
            </>
          )}
    </Dialog>
  );
};
