import {
  APP_SETTINGS_DOCUMENT_ID,
  AppSettings,
  COLLECTIONS,
  PersistenceCodec,
  Outcome,
  User,
  canManageAppSettings,
  failure,
  parseAppSettings,
  success,
} from '../../core/domain';
import { MediaCoordinator, localMedia } from '../../core/media';
import {
  AppSettingsReader,
  DocumentStore,
} from '../../core/ports';

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
    if (!actor) return failure('unauthenticated', 'Sign in to manage app settings');
    if (!canManageAppSettings(actor.role)) {
      return failure('forbidden', 'Only the President may manage app settings');
    }

    let settings: AppSettings;
    try {
      settings = parseAppSettings(draft);
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

  private persist(settings: AppSettings): Promise<void> {
    return this.dependencies.documents.put(
      COLLECTIONS.appSettings,
      APP_SETTINGS_DOCUMENT_ID,
      this.dependencies.codecs.appSettings.encode(settings),
    );
  }

  private async needsContributorMigration(settings: AppSettings): Promise<boolean> {
    if (!settings.sightingsAnonymous) return false;
    const existing = await this.dependencies.documents.get(
      COLLECTIONS.appSettings,
      APP_SETTINGS_DOCUMENT_ID,
    );
    if (!existing) return true;
    return !this.dependencies.codecs.appSettings.decode(existing.id, existing.data)
      .sightingsAnonymous;
  }
}
