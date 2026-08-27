import {
  Announcement,
  COLLECTIONS,
  Clock,
  PersistenceCodec,
  IdGenerator,
  Outcome,
  OutcomeMessage,
  OutcomeWarningCode,
  User,
  canAccessRolePolicy,
  failure,
  parseAnnouncement,
  success,
  roleAccessPolicies,
  roleAccessRequirement,
} from '../../core/domain';
import { MediaCoordinator, MediaSelection, localMedia } from '../../core/media';
import {
  ApplicationEffects,
  DocumentStore,
  MediaStore,
  StoredDocument,
  StoredMediaAsset,
} from '../../core/ports';

export interface AnnouncementDraft {
  readonly title: string;
  readonly info: string;
  readonly authorAlias: string;
  readonly photos: readonly string[];
}

export interface AnnouncementUpdate {
  readonly title: string;
  readonly info: string;
  readonly authorAlias: string;
  readonly photos: readonly MediaSelection[];
}

export type AnnouncementListItem = Announcement & {
  readonly read: boolean;
};

interface AnnouncementsDependencies {
  readonly documents: DocumentStore;
  readonly media: MediaStore;
  readonly mediaCoordinator: MediaCoordinator;
  readonly effects: ApplicationEffects;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly codecs: { readonly announcement: PersistenceCodec<Announcement> };
}

export class AnnouncementsModule {
  constructor(private readonly dependencies: AnnouncementsDependencies) {}

  async list(
    actor: User | undefined,
  ): Promise<Outcome<readonly AnnouncementListItem[]>> {
    if (!actor)
      return failure('unauthenticated', 'Sign in to view announcements');
    try {
      const documents = await this.dependencies.documents.list(
        COLLECTIONS.announcements,
      );
      let receiptDocuments: readonly StoredDocument[] = [];
      let receiptWarning: readonly OutcomeMessage<OutcomeWarningCode>[] = [];
      try {
        receiptDocuments = await this.dependencies.documents.listWhereEqual(
          COLLECTIONS.announcementReadReceipts,
          'userId',
          actor.id,
        );
      } catch {
        receiptWarning = [
          {
            code: 'partial_completion',
            message: 'Announcements loaded, but read status is unavailable',
          },
        ];
      }
      const readAnnouncementIds = new Set(
        receiptDocuments.flatMap(({ data }) =>
          typeof data.announcementId === 'string' ? [data.announcementId] : [],
        ),
      );
      const announcements = documents.map(({ id, data }) => ({
        ...this.dependencies.codecs.announcement.decode(id, data),
        read: readAnnouncementIds.has(id),
      }));
      return success(
        announcements.sort(
          (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
        ),
        receiptWarning,
      );
    } catch {
      return failure('dependency_failure', 'Could not load announcements');
    }
  }

  async markRead(
    actor: User | undefined,
    announcementId: string,
  ): Promise<Outcome<void>> {
    if (!actor)
      return failure('unauthenticated', 'Sign in to read announcements');
    if (!announcementId.trim()) {
      return failure('validation', 'Announcement ID is required');
    }
    try {
      await this.dependencies.documents.put(
        COLLECTIONS.announcementReadReceipts,
        `${actor.id}__${announcementId}`,
        {
          userId: actor.id,
          announcementId,
          readAt: this.dependencies.clock.now(),
        },
      );
      return success(undefined);
    } catch {
      return failure(
        'dependency_failure',
        'Could not record the announcement as read',
      );
    }
  }

  async get(id: string): Promise<Outcome<Announcement>> {
    try {
      const document = await this.dependencies.documents.get(
        COLLECTIONS.announcements,
        id,
      );
      return document
        ? success(
            this.dependencies.codecs.announcement.decode(
              document.id,
              document.data,
            ),
          )
        : failure('not_found', 'Announcement not found');
    } catch {
      return failure('dependency_failure', 'Could not load the announcement');
    }
  }

  async media(id: string): Promise<Outcome<readonly StoredMediaAsset[]>> {
    try {
      return success(
        await this.dependencies.media.list(
          `${COLLECTIONS.announcements}/${id}`,
        ),
      );
    } catch {
      return failure('dependency_failure', 'Could not load announcement media');
    }
  }

  async create(
    actor: User | undefined,
    draft: AnnouncementDraft,
  ): Promise<Outcome<Announcement>> {
    const denied = mutationDenied(actor);
    if (denied) return denied;
    const validation = validateAnnouncement(draft);
    if (validation) return failure('validation', validation);

    const id = this.dependencies.ids.next();
    const announcement = parseAnnouncement({
      id,
      title: draft.title,
      info: draft.info,
      authorAlias: draft.authorAlias,
      createdAt: this.dependencies.clock.now(),
      createdBy: actor,
    });
    const mediaResult =
      await this.dependencies.mediaCoordinator.reconcileGallery({
        folder: `${COLLECTIONS.announcements}/${id}`,
        gallery: draft.photos.map(localMedia),
        persist: async () =>
          this.dependencies.documents.put(
            COLLECTIONS.announcements,
            id,
            this.dependencies.codecs.announcement.encode(announcement),
          ),
      });
    if (!mediaResult.ok) return mediaResult;

    const warnings = [...mediaResult.warnings];
    try {
      await this.dependencies.effects.notifyAnnouncement({
        title: announcement.title,
        body: announcement.info,
      });
    } catch {
      warnings.push({
        code: 'notification_failed',
        message: 'Announcement saved, but push notification delivery failed',
      });
    }
    return success(announcement, warnings);
  }

  async update(
    actor: User | undefined,
    id: string,
    update: AnnouncementUpdate,
  ): Promise<Outcome<Announcement>> {
    const denied = mutationDenied(actor);
    if (denied) return denied;
    const existing = await this.get(id);
    if (!existing.ok) return existing;
    const validation = validateAnnouncement(update);
    if (validation) return failure('validation', validation);

    const announcement = parseAnnouncement({
      id,
      title: update.title,
      info: update.info,
      authorAlias: update.authorAlias,
      createdAt: this.dependencies.clock.now(),
      createdBy: actor,
    });
    const mediaResult =
      await this.dependencies.mediaCoordinator.reconcileGallery({
        folder: `${COLLECTIONS.announcements}/${id}`,
        gallery: update.photos,
        persist: async () =>
          this.dependencies.documents.put(
            COLLECTIONS.announcements,
            id,
            this.dependencies.codecs.announcement.encode(announcement),
          ),
      });
    return mediaResult.ok
      ? success(announcement, mediaResult.warnings)
      : mediaResult;
  }

  async remove(actor: User | undefined, id: string): Promise<Outcome<void>> {
    const denied = mutationDenied(actor);
    if (denied) return denied;
    const existing = await this.get(id);
    if (!existing.ok) return existing;

    try {
      await this.dependencies.documents.remove(COLLECTIONS.announcements, id);
    } catch {
      return failure('dependency_failure', 'Could not delete the announcement');
    }

    try {
      const assets = await this.dependencies.media.list(
        `${COLLECTIONS.announcements}/${id}`,
      );
      const cleanup = await Promise.allSettled(
        assets.map(({ id: mediaId }) =>
          this.dependencies.media.remove(mediaId),
        ),
      );
      return success(
        undefined,
        cleanup.some(({ status }) => status === 'rejected')
          ? [
              {
                code: 'cleanup_failed',
                message: 'The announcement was deleted, but some media remains',
              },
            ]
          : [],
      );
    } catch {
      return success(undefined, [
        {
          code: 'cleanup_failed',
          message: 'The announcement was deleted, but some media remains',
        },
      ]);
    }
  }
}

function mutationDenied(actor: User | undefined): Outcome<never> | undefined {
  if (!actor)
    return failure('unauthenticated', 'Sign in to manage announcements');
  if (!canAccessRolePolicy(actor.role, roleAccessPolicies.manageAnnouncements)) {
    return failure(
      'forbidden',
      roleAccessRequirement(roleAccessPolicies.manageAnnouncements),
    );
  }
  return undefined;
}

function validateAnnouncement(
  announcement: Pick<AnnouncementDraft, 'title' | 'info'>,
): string | undefined {
  if (!announcement.title.trim()) return 'Title cannot be empty.';
  if (!announcement.info.trim()) return 'Description cannot be empty.';
  return undefined;
}
