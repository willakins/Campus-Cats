import {
  Alert,
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
  parseAlert,
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

export interface AlertDraft {
  readonly title: string;
  readonly info: string;
  readonly authorAlias: string;
  readonly photos: readonly string[];
}

export interface AlertUpdate {
  readonly title: string;
  readonly info: string;
  readonly authorAlias: string;
  readonly photos: readonly MediaSelection[];
}

export type AlertListItem = Alert & {
  readonly read: boolean;
};

interface AlertsDependencies {
  readonly documents: DocumentStore;
  readonly media: MediaStore;
  readonly mediaCoordinator: MediaCoordinator;
  readonly effects: ApplicationEffects;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly codecs: { readonly alert: PersistenceCodec<Alert> };
}

export class AlertsModule {
  constructor(private readonly dependencies: AlertsDependencies) {}

  async list(
    actor: User | undefined,
  ): Promise<Outcome<readonly AlertListItem[]>> {
    if (!actor) return failure('unauthenticated', 'Sign in to view alerts');
    try {
      const [contentAttempt, receiptAttempt] = await Promise.allSettled([
        this.dependencies.documents.list(COLLECTIONS.alerts),
        this.dependencies.documents.listWhereEqual(
          COLLECTIONS.alertReadReceipts,
          'userId',
          actor.id,
        ),
      ]);
      if (contentAttempt.status === 'rejected') throw contentAttempt.reason;
      const documents = contentAttempt.value;
      let receiptDocuments: readonly StoredDocument[] = [];
      let receiptWarning: readonly OutcomeMessage<OutcomeWarningCode>[] = [];
      if (receiptAttempt.status === 'fulfilled') {
        receiptDocuments = receiptAttempt.value;
      } else {
        receiptWarning = [
          {
            code: 'partial_completion',
            message: 'Alerts loaded, but read status is unavailable',
          },
        ];
      }
      const readAlertIds = new Set(
        receiptDocuments.flatMap(({ data }) =>
          typeof data.alertId === 'string' ? [data.alertId] : [],
        ),
      );
      const alerts = documents.map(({ id, data }) => ({
        ...this.dependencies.codecs.alert.decode(id, data),
        read: readAlertIds.has(id),
      }));
      return success(
        alerts.sort(
          (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
        ),
        receiptWarning,
      );
    } catch {
      return failure('dependency_failure', 'Could not load alerts');
    }
  }

  async markRead(
    actor: User | undefined,
    alertId: string,
  ): Promise<Outcome<void>> {
    if (!actor)
      return failure('unauthenticated', 'Sign in to read alerts');
    if (!alertId.trim()) {
      return failure('validation', 'Alert ID is required');
    }
    try {
      await this.dependencies.documents.put(
        COLLECTIONS.alertReadReceipts,
        `${actor.id}__${alertId}`,
        {
          userId: actor.id,
          alertId,
          readAt: this.dependencies.clock.now(),
        },
      );
      return success(undefined);
    } catch {
      return failure(
        'dependency_failure',
        'Could not record the alert as read',
      );
    }
  }

  async get(id: string): Promise<Outcome<Alert>> {
    try {
      const document = await this.dependencies.documents.get(
        COLLECTIONS.alerts,
        id,
      );
      return document
        ? success(
            this.dependencies.codecs.alert.decode(
              document.id,
              document.data,
            ),
          )
        : failure('not_found', 'Alert not found');
    } catch {
      return failure('dependency_failure', 'Could not load the alert');
    }
  }

  async media(id: string): Promise<Outcome<readonly StoredMediaAsset[]>> {
    try {
      return success(
        await this.dependencies.media.list(
          `${COLLECTIONS.alerts}/${id}`,
        ),
      );
    } catch {
      return failure('dependency_failure', 'Could not load alert media');
    }
  }

  async create(
    actor: User | undefined,
    draft: AlertDraft,
  ): Promise<Outcome<Alert>> {
    const denied = mutationDenied(actor);
    if (denied) return denied;
    const validation = validateAlert(draft);
    if (validation) return failure('validation', validation);

    const id = this.dependencies.ids.next();
    const alert = parseAlert({
      id,
      title: draft.title,
      info: draft.info,
      authorAlias: draft.authorAlias,
      createdAt: this.dependencies.clock.now(),
      createdBy: actor,
    });
    const mediaResult =
      await this.dependencies.mediaCoordinator.reconcileGallery({
        folder: `${COLLECTIONS.alerts}/${id}`,
        gallery: draft.photos.map(localMedia),
        persist: async () =>
          this.dependencies.documents.put(
            COLLECTIONS.alerts,
            id,
            this.dependencies.codecs.alert.encode(alert),
          ),
      });
    if (!mediaResult.ok) return mediaResult;

    const warnings = [...mediaResult.warnings];
    try {
      await this.dependencies.effects.notifyAlert({
        title: alert.title,
        body: alert.info,
      });
    } catch {
      warnings.push({
        code: 'notification_failed',
        message: 'Alert saved, but push notification delivery failed',
      });
    }
    return success(alert, warnings);
  }

  async update(
    actor: User | undefined,
    id: string,
    update: AlertUpdate,
  ): Promise<Outcome<Alert>> {
    const denied = mutationDenied(actor);
    if (denied) return denied;
    const existing = await this.get(id);
    if (!existing.ok) return existing;
    const validation = validateAlert(update);
    if (validation) return failure('validation', validation);

    const alert = parseAlert({
      id,
      title: update.title,
      info: update.info,
      authorAlias: update.authorAlias,
      createdAt: this.dependencies.clock.now(),
      createdBy: actor,
    });
    const mediaResult =
      await this.dependencies.mediaCoordinator.reconcileGallery({
        folder: `${COLLECTIONS.alerts}/${id}`,
        gallery: update.photos,
        persist: async () =>
          this.dependencies.documents.put(
            COLLECTIONS.alerts,
            id,
            this.dependencies.codecs.alert.encode(alert),
          ),
      });
    return mediaResult.ok
      ? success(alert, mediaResult.warnings)
      : mediaResult;
  }

  async remove(actor: User | undefined, id: string): Promise<Outcome<void>> {
    const denied = mutationDenied(actor);
    if (denied) return denied;
    const existing = await this.get(id);
    if (!existing.ok) return existing;

    try {
      await this.dependencies.documents.remove(COLLECTIONS.alerts, id);
    } catch {
      return failure('dependency_failure', 'Could not delete the alert');
    }

    try {
      const assets = await this.dependencies.media.list(
        `${COLLECTIONS.alerts}/${id}`,
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
                message: 'The alert was deleted, but some media remains',
              },
            ]
          : [],
      );
    } catch {
      return success(undefined, [
        {
          code: 'cleanup_failed',
          message: 'The alert was deleted, but some media remains',
        },
      ]);
    }
  }
}

function mutationDenied(actor: User | undefined): Outcome<never> | undefined {
  if (!actor)
    return failure('unauthenticated', 'Sign in to manage alerts');
  if (!canAccessRolePolicy(actor.role, roleAccessPolicies.manageAlerts)) {
    return failure(
      'forbidden',
      roleAccessRequirement(roleAccessPolicies.manageAlerts),
    );
  }
  return undefined;
}

function validateAlert(
  alert: Pick<AlertDraft, 'title' | 'info'>,
): string | undefined {
  if (!alert.title.trim()) return 'Title cannot be empty.';
  if (!alert.info.trim()) return 'Description cannot be empty.';
  return undefined;
}
