import {
  COLLECTIONS,
  Clock,
  COMMENT_CHARACTER_LIMIT,
  Comment,
  CommentTarget,
  IdGenerator,
  Outcome,
  PersistenceCodec,
  PublicProfile,
  User,
  canManageFeature,
  commentCollection,
  commentTargetDocument,
  commentTargetKey,
  failure,
  parseComment,
  parseCommentTarget,
  success,
} from '../../core/domain';
import { DocumentStore } from '../../core/ports';

interface CommentsDependencies {
  readonly documents: DocumentStore;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly codecs: {
    readonly comment: PersistenceCodec<Comment>;
    readonly publicProfile: PersistenceCodec<PublicProfile>;
  };
}

export class CommentsModule {
  constructor(private readonly dependencies: CommentsDependencies) {}

  async list(
    actor: User | undefined,
    targetValue: CommentTarget,
  ): Promise<Outcome<readonly Comment[]>> {
    if (!actor) return failure('unauthenticated', 'Sign in to view comments');
    const target = validTarget(targetValue);
    if (!target.ok) return target;
    try {
      const documents = await this.dependencies.documents.listWhereEqual(
        commentCollection(target.value),
        'targetKey',
        commentTargetKey(target.value),
      );
      const comments = documents
        .map(({ id, data }) => {
          try {
            return this.dependencies.codecs.comment.decode(id, data);
          } catch (error) {
            console.warn(
              `[comments] Ignoring invalid comment document: ${id}`,
              error instanceof Error ? error.message : error,
            );
            return undefined;
          }
        })
        .filter((comment): comment is Comment =>
          Boolean(
            comment &&
            comment.target.kind === target.value.kind &&
            comment.target.id === target.value.id,
          ),
        )
        .sort((left, right) =>
          left.createdAt.getTime() - right.createdAt.getTime(),
        );
      return success(await this.withAuthors(comments));
    } catch {
      return failure('dependency_failure', 'Could not load comments');
    }
  }

  async create(
    actor: User | undefined,
    targetValue: CommentTarget,
    body: string,
  ): Promise<Outcome<Comment>> {
    if (!actor) return failure('unauthenticated', 'Sign in to post a comment');
    const target = validTarget(targetValue);
    if (!target.ok) return target;
    try {
      const targetDocument = commentTargetDocument(target.value);
      const existingTarget = await this.dependencies.documents.get(
        targetDocument.collection,
        targetDocument.id,
      );
      if (!existingTarget) {
        return failure(
          'not_found',
          'The item you are commenting on no longer exists',
        );
      }
    } catch {
      return failure(
        'dependency_failure',
        'Could not verify the comment target',
      );
    }
    let comment: Comment;
    try {
      comment = parseComment({
        id: this.dependencies.ids.next(),
        target: target.value,
        body,
        createdAt: this.dependencies.clock.now(),
        createdById: actor.id,
      });
    } catch {
      return failure(
        'validation',
        `A comment must be between 1 and ${COMMENT_CHARACTER_LIMIT} characters`,
      );
    }
    try {
      await this.dependencies.documents.put(
        commentCollection(target.value),
        comment.id,
        this.dependencies.codecs.comment.encode(comment),
      );
      return success((await this.withAuthors([comment]))[0] ?? comment);
    } catch {
      return failure('dependency_failure', 'Could not post the comment');
    }
  }

  async remove(
    actor: User | undefined,
    targetValue: CommentTarget,
    id: string,
  ): Promise<Outcome<void>> {
    if (!actor) return failure('unauthenticated', 'Sign in to delete comments');
    if (!canManageFeature(actor.role)) {
      return failure('forbidden', 'Only officers may delete comments');
    }
    const target = validTarget(targetValue);
    if (!target.ok) return target;
    const collection = commentCollection(target.value);
    try {
      const existing = await this.dependencies.documents.get(
        collection,
        id,
      );
      if (!existing) return failure('not_found', 'Comment not found');
      const comment = this.dependencies.codecs.comment.decode(
        existing.id,
        existing.data,
      );
      if (
        comment.target.kind !== target.value.kind ||
        comment.target.id !== target.value.id
      ) {
        return failure('not_found', 'Comment not found');
      }
      if (comment.source === 'inaturalist') {
        await this.dependencies.documents.commit([
          {
            operation: 'put',
            collection: COLLECTIONS.inaturalistCommentModeration,
            id: comment.id,
            data: {
              commentId: comment.id,
              targetKey: commentTargetKey(comment.target),
              hiddenById: actor.id,
              hiddenAt: this.dependencies.clock.now(),
            },
          },
          { operation: 'remove', collection, id },
        ]);
      } else {
        await this.dependencies.documents.remove(collection, id);
      }
      return success(undefined);
    } catch {
      return failure('dependency_failure', 'Could not delete the comment');
    }
  }

  private async withAuthors(
    comments: readonly Comment[],
  ): Promise<readonly Comment[]> {
    const localAuthorIds = comments.flatMap((comment) =>
      comment.source === 'campus-cats' && comment.createdById
        ? [comment.createdById]
        : [],
    );
    const profileEntries = await Promise.all(
      [...new Set(localAuthorIds)].map(
        async (userId) => {
          try {
            const document = await this.dependencies.documents.get(
              COLLECTIONS.publicProfiles,
              userId,
            );
            return [
              userId,
              document
                ? this.dependencies.codecs.publicProfile.decode(
                    document.id,
                    document.data,
                  )
                : undefined,
            ] as const;
          } catch {
            return [userId, undefined] as const;
          }
        },
      ),
    );
    const profiles = new Map(profileEntries);
    return comments.map((comment) => {
      const author = comment.createdById
        ? profiles.get(comment.createdById)
        : undefined;
      return author ? parseComment({ ...comment, author }) : comment;
    });
  }
}

const validTarget = (value: CommentTarget): Outcome<CommentTarget> => {
  try {
    return success(parseCommentTarget(value));
  } catch {
    return failure('validation', 'Choose valid content to comment on');
  }
};
