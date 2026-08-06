import {
  AchievementId,
  COLLECTIONS,
  FirestoreCodec,
  Outcome,
  PublicProfile,
  User,
  failure,
  success,
} from '../../core/domain';
import { MediaCoordinator, MediaSelection } from '../../core/media';
import { CallableEffects, DocumentStore, MediaStore } from '../../core/ports';

export interface PublicProfileDraft {
  readonly displayName: string;
  readonly bio: string;
  readonly photo?: MediaSelection;
}

interface ProfilesDependencies {
  readonly documents: DocumentStore;
  readonly media: MediaStore;
  readonly mediaCoordinator: MediaCoordinator;
  readonly effects: CallableEffects;
  readonly codecs: { readonly publicProfile: FirestoreCodec<PublicProfile> };
}

export class ProfilesModule {
  constructor(private readonly dependencies: ProfilesDependencies) {}

  async get(id: string): Promise<Outcome<PublicProfile>> {
    try {
      const document = await this.dependencies.documents.get(
        COLLECTIONS.publicProfiles,
        id,
      );
      return document
        ? success(
            this.dependencies.codecs.publicProfile.decode(
              document.id,
              document.data,
            ),
          )
        : failure('not_found', 'Member profile not found');
    } catch {
      return failure('dependency_failure', 'Could not load the member profile');
    }
  }

  async sync(actor: User | undefined): Promise<Outcome<PublicProfile>> {
    if (!actor) return failure('unauthenticated', 'Sign in to load your profile');
    try {
      await this.dependencies.effects.syncPublicProfile(actor.id);
    } catch {
      return failure('dependency_failure', 'Could not update profile achievements');
    }
    return this.get(actor.id);
  }

  async getOrSync(id: string): Promise<Outcome<PublicProfile>> {
    const existing = await this.get(id);
    if (existing.ok || existing.error.code !== 'not_found') return existing;
    try {
      await this.dependencies.effects.syncPublicProfile(id);
    } catch {
      return failure('dependency_failure', 'Could not prepare the member profile');
    }
    return this.get(id);
  }

  async update(
    actor: User | undefined,
    draft: PublicProfileDraft,
  ): Promise<Outcome<PublicProfile>> {
    if (!actor) return failure('unauthenticated', 'Sign in to update your profile');
    const displayName = draft.displayName.trim();
    const bio = draft.bio.trim();
    if (!displayName || displayName.length > 60) {
      return failure('validation', 'Display name must be between 1 and 60 characters');
    }
    if (bio.length > 500) {
      return failure('validation', 'Bio cannot exceed 500 characters');
    }

    const mediaResult = await this.dependencies.mediaCoordinator.reconcileGallery({
      folder: `${COLLECTIONS.publicProfiles}/${actor.id}`,
      ownerId: actor.id,
      gallery: draft.photo ? [draft.photo] : [],
      persist: async (assets) =>
        this.dependencies.effects.updatePublicProfile({
          displayName,
          bio,
          profilePhotoUrl: assets[0]?.url ?? '',
        }),
    });
    if (!mediaResult.ok) return mediaResult;

    const profile = await this.get(actor.id);
    return profile.ok
      ? success(profile.value, mediaResult.warnings)
      : profile;
  }

  async selectTitle(
    actor: User | undefined,
    achievementId: AchievementId | '',
  ): Promise<Outcome<PublicProfile>> {
    if (!actor) return failure('unauthenticated', 'Sign in to choose a title');
    try {
      await this.dependencies.effects.selectProfileTitle(achievementId);
    } catch {
      return failure('dependency_failure', 'Could not update your displayed title');
    }
    return this.get(actor.id);
  }

  async media(id: string) {
    try {
      return success(
        await this.dependencies.media.list(`${COLLECTIONS.publicProfiles}/${id}`),
      );
    } catch {
      return failure('dependency_failure', 'Could not load profile media');
    }
  }
}
