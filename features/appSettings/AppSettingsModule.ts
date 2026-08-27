import {
  APP_SETTINGS_DOCUMENT_ID,
  AppSettings,
  COLLECTIONS,
  DonationPageDraft,
  PersistenceCodec,
  Outcome,
  User,
  canAccessRolePolicy,
  failure,
  parseAppSettings,
  parseDonationPageDraft,
  success,
  roleAccessPolicies,
  roleAccessRequirement,
} from '../../core/domain';
import { MediaCoordinator, MediaSelection, localMedia } from '../../core/media';
import { AppSettingsReader, DocumentStore } from '../../core/ports';

export interface AppSettingsDraft {
  readonly logoUrl: string;
  readonly primaryColor: string;
  readonly accentColor: string;
  readonly sightingsAnonymous: boolean;
}

interface AppSettingsDependencies {
  readonly documents: DocumentStore;
  readonly mediaCoordinator: MediaCoordinator;
  readonly codecs: { readonly appSettings: PersistenceCodec<AppSettings> };
  readonly migrateContributorPrivacy?: () => Promise<void>;
}

export class AppSettingsModule implements AppSettingsReader {
  constructor(private readonly dependencies: AppSettingsDependencies) {}

  async getSettings(): Promise<AppSettings> {
    const document = await this.dependencies.documents.get(
      COLLECTIONS.appSettings,
      APP_SETTINGS_DOCUMENT_ID,
    );
    return document
      ? this.dependencies.codecs.appSettings.decode(document.id, document.data)
      : this.dependencies.codecs.appSettings.decode(
          APP_SETTINGS_DOCUMENT_ID,
          {},
        );
  }

  async get(): Promise<Outcome<AppSettings>> {
    try {
      return success(await this.getSettings());
    } catch {
      return failure('dependency_failure', 'Could not load app settings');
    }
  }

  async save(
    actor: User | undefined,
    draft: AppSettingsDraft,
    logoLocalUri?: string,
  ): Promise<Outcome<AppSettings>> {
    if (!actor)
      return failure('unauthenticated', 'Sign in to manage app settings');
    if (!canAccessRolePolicy(actor.role, roleAccessPolicies.manageAppSettings)) {
      return failure(
        'forbidden',
        roleAccessRequirement(roleAccessPolicies.manageAppSettings),
      );
    }

    let existing: AppSettings;
    try {
      existing = await this.getSettings();
    } catch {
      return failure('dependency_failure', 'Could not load app settings');
    }

    let settings: AppSettings;
    try {
      settings = parseAppSettings({ ...existing, ...draft });
    } catch {
      return failure(
        'validation',
        'Use valid six-digit hex colors and try again',
      );
    }

    if (!logoLocalUri) {
      try {
        if (await this.needsContributorMigration(settings)) {
          await this.dependencies.migrateContributorPrivacy?.();
        }
        await this.persist(settings);
        return success(settings);
      } catch {
        return failure('dependency_failure', 'Could not save app settings');
      }
    }

    const mediaResult = await this.dependencies.mediaCoordinator.reconcile({
      folder: 'app-branding',
      ownerId: actor.id,
      profile: localMedia(logoLocalUri),
      gallery: [],
      persist: async ({ profile }) => {
        settings = parseAppSettings({ ...settings, logoUrl: profile.url });
        if (await this.needsContributorMigration(settings)) {
          await this.dependencies.migrateContributorPrivacy?.();
        }
        await this.persist(settings);
      },
    });
    return mediaResult.ok
      ? success(settings, mediaResult.warnings)
      : mediaResult;
  }

  async saveDonationPage(
    actor: User | undefined,
    draft: DonationPageDraft,
    images: readonly MediaSelection[],
  ): Promise<Outcome<AppSettings>> {
    if (!actor)
      return failure('unauthenticated', 'Sign in to manage donations');
    if (!canAccessRolePolicy(actor.role, roleAccessPolicies.manageDonations)) {
      return failure(
        'forbidden',
        roleAccessRequirement(roleAccessPolicies.manageDonations),
      );
    }
    if (images.length > 1) {
      return failure('validation', 'You can add one donation photo');
    }

    let donationPage: DonationPageDraft;
    try {
      donationPage = parseDonationPageDraft(draft);
    } catch {
      return failure(
        'validation',
        'Add a title, description, and valid donation link',
      );
    }
    if (donationPage.method === 'direct') {
      return failure('validation', 'In-app donations are coming soon');
    }

    let settings: AppSettings;
    try {
      settings = await this.getSettings();
    } catch {
      return failure('dependency_failure', 'Could not load donation settings');
    }

    const mediaResult =
      await this.dependencies.mediaCoordinator.reconcileGallery({
        folder: 'donations',
        ownerId: actor.id,
        gallery: images,
        persist: async (gallery) => {
          settings = parseAppSettings({
            ...settings,
            donationPage: {
              ...donationPage,
              images: gallery.map(({ id, url }) => ({ id, url })),
            },
          });
          await this.persist(settings);
        },
      });
    return mediaResult.ok
      ? success(settings, mediaResult.warnings)
      : mediaResult;
  }

  private persist(settings: AppSettings): Promise<void> {
    return this.dependencies.documents.put(
      COLLECTIONS.appSettings,
      APP_SETTINGS_DOCUMENT_ID,
      this.dependencies.codecs.appSettings.encode(settings),
    );
  }

  private async needsContributorMigration(
    settings: AppSettings,
  ): Promise<boolean> {
    if (!settings.sightingsAnonymous) return false;
    const existing = await this.dependencies.documents.get(
      COLLECTIONS.appSettings,
      APP_SETTINGS_DOCUMENT_ID,
    );
    if (!existing) return true;
    return !this.dependencies.codecs.appSettings.decode(
      existing.id,
      existing.data,
    ).sightingsAnonymous;
  }
}
