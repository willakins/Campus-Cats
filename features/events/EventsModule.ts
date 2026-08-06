import {
  COLLECTIONS,
  Clock,
  ClubEvent,
  PersistenceCodec,
  IdGenerator,
  Outcome,
  User,
  canManageFeature,
  failure,
  isExpiredEvent,
  parseClubEvent,
  success,
} from '../../core/domain';
import { MediaCoordinator, MediaSelection, localMedia } from '../../core/media';
import { DocumentStore, MediaStore } from '../../core/ports';

export interface EventDraft {
  readonly title: string;
  readonly details: string;
  readonly location: string;
  readonly startsAt: Date;
  readonly expiresAt: Date;
  readonly imageLocalUri: string;
}

export interface EventUpdate {
  readonly title: string;
  readonly details: string;
  readonly location: string;
  readonly startsAt: Date;
  readonly expiresAt: Date;
  readonly image: MediaSelection;
}

interface EventsDependencies {
  readonly documents: DocumentStore;
  readonly media: MediaStore;
  readonly mediaCoordinator: MediaCoordinator;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly codec: PersistenceCodec<ClubEvent>;
}

export class EventsModule {
  constructor(private readonly dependencies: EventsDependencies) {}

  async list(actor: User | undefined): Promise<Outcome<readonly ClubEvent[]>> {
    if (!actor) return failure('unauthenticated', 'Sign in to view events');
    try {
      const documents = await this.dependencies.documents.list(COLLECTIONS.events);
      const now = this.dependencies.clock.now();
      let invalidCount = 0;
      const events = documents
        .flatMap(({ id, data }) => {
          try {
            return [this.dependencies.codec.decode(id, data)];
          } catch {
            invalidCount += 1;
            return [];
          }
        })
        .filter(
          (event) =>
            canManageFeature(actor.role) || !isExpiredEvent(event, now),
        )
        .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
      return success(
        events,
        invalidCount
          ? [
              {
                code: 'partial_completion',
                message: `${invalidCount} invalid ${invalidCount === 1 ? 'event was' : 'events were'} excluded.`,
              },
            ]
          : [],
      );
    } catch {
      return failure('dependency_failure', 'Could not load events');
    }
  }

  async get(
    actor: User | undefined,
    id: string,
  ): Promise<Outcome<ClubEvent>> {
    if (!actor) return failure('unauthenticated', 'Sign in to view events');
    try {
      const document = await this.dependencies.documents.get(COLLECTIONS.events, id);
      if (!document) return failure('not_found', 'Event not found');
      const event = this.dependencies.codec.decode(document.id, document.data);
      if (!canManageFeature(actor.role) && isExpiredEvent(event, this.dependencies.clock.now())) {
        return failure('not_found', 'Event not found');
      }
      return success(event);
    } catch {
      return failure('dependency_failure', 'Could not load the event');
    }
  }

  async create(
    actor: User | undefined,
    draft: EventDraft,
  ): Promise<Outcome<ClubEvent>> {
    if (!actor) return failure('unauthenticated', 'Sign in to manage events');
    if (!canManageFeature(actor.role)) {
      return failure('forbidden', 'Only officers may manage events');
    }
    const validation = validateEvent(draft, draft.imageLocalUri);
    if (validation) return failure('validation', validation);

    const id = this.dependencies.ids.next();
    const createdAt = this.dependencies.clock.now();
    const eventWithImage = (imageUrl: string) =>
      parseClubEvent({
        id,
        title: draft.title,
        details: draft.details,
        location: draft.location,
        startsAt: draft.startsAt,
        expiresAt: draft.expiresAt,
        imageUrl,
        createdAt,
        createdBy: actor,
      });
    const mediaResult = await this.dependencies.mediaCoordinator.reconcile({
      folder: `${COLLECTIONS.events}/${id}`,
      ownerId: actor.id,
      profile: localMedia(draft.imageLocalUri),
      gallery: [],
      persist: async ({ profile }) => {
        const event = eventWithImage(profile.url);
        await this.dependencies.documents.put(
          COLLECTIONS.events,
          id,
          this.dependencies.codec.encode(event),
        );
      },
    });
    if (!mediaResult.ok) return mediaResult;
    return success(eventWithImage(mediaResult.value.profile.url), mediaResult.warnings);
  }

  async update(
    actor: User | undefined,
    id: string,
    update: EventUpdate,
  ): Promise<Outcome<ClubEvent>> {
    if (!actor) return failure('unauthenticated', 'Sign in to manage events');
    if (!canManageFeature(actor.role)) {
      return failure('forbidden', 'Only officers may manage events');
    }
    const validation = validateEvent(update, 'selected');
    if (validation) return failure('validation', validation);
    const existing = await this.get(actor, id);
    if (!existing.ok) return existing;

    const eventWithImage = (imageUrl: string) =>
      parseClubEvent({
        ...existing.value,
        title: update.title,
        details: update.details,
        location: update.location,
        startsAt: update.startsAt,
        expiresAt: update.expiresAt,
        imageUrl,
      });
    const mediaResult = await this.dependencies.mediaCoordinator.reconcile({
      folder: `${COLLECTIONS.events}/${id}`,
      ownerId: actor.id,
      profile: update.image,
      gallery: [],
      persist: async ({ profile }) => {
        const event = eventWithImage(profile.url);
        await this.dependencies.documents.put(
          COLLECTIONS.events,
          id,
          this.dependencies.codec.encode(event),
        );
      },
    });
    if (!mediaResult.ok) return mediaResult;
    return success(eventWithImage(mediaResult.value.profile.url), mediaResult.warnings);
  }

  async remove(actor: User | undefined, id: string): Promise<Outcome<void>> {
    if (!actor) return failure('unauthenticated', 'Sign in to manage events');
    if (!canManageFeature(actor.role)) {
      return failure('forbidden', 'Only officers may manage events');
    }
    const existing = await this.get(actor, id);
    if (!existing.ok) return existing;
    try {
      await this.dependencies.documents.remove(COLLECTIONS.events, id);
    } catch {
      return failure('dependency_failure', 'Could not delete the event');
    }

    try {
      const assets = await this.dependencies.media.list(`${COLLECTIONS.events}/${id}`);
      const cleanup = await Promise.allSettled(
        assets.map(({ id: mediaId }) => this.dependencies.media.remove(mediaId)),
      );
      return success(
        undefined,
        cleanup.some(({ status }) => status === 'rejected')
          ? [{ code: 'cleanup_failed', message: 'The event was deleted, but its image remains' }]
          : [],
      );
    } catch {
      return success(undefined, [
        { code: 'cleanup_failed', message: 'The event was deleted, but its image remains' },
      ]);
    }
  }
}

function validateEvent(
  event: Pick<EventDraft, 'title' | 'details' | 'location' | 'startsAt' | 'expiresAt'>,
  image: string,
): string | undefined {
  if (!event.title.trim()) return 'Event title cannot be empty.';
  if (event.title.trim().length > 120) {
    return 'Event title must be 120 characters or fewer.';
  }
  if (!event.details.trim()) return 'Event details cannot be empty.';
  if (event.details.trim().length > 5000) {
    return 'Event details must be 5,000 characters or fewer.';
  }
  if (!event.location.trim()) return 'Event location cannot be empty.';
  if (event.location.trim().length > 300) {
    return 'Event location must be 300 characters or fewer.';
  }
  if (Number.isNaN(event.startsAt.getTime()) || Number.isNaN(event.expiresAt.getTime())) {
    return 'Choose valid event and expiration dates.';
  }
  if (event.expiresAt.getTime() < event.startsAt.getTime()) {
    return 'The expiration date must be on or after the event date.';
  }
  if (!image.trim()) return 'An event picture is required.';
  return undefined;
}
