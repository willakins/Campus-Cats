import {
  CatalogOverride,
  PersistenceCodec,
  ImportedCatalogProfile,
  ImportedObservation,
  InaturalistSyncStatus,
  Outcome,
  User,
  canAccessRolePolicy,
  failure,
  success,
  roleAccessPolicies,
  roleAccessRequirement,
} from '../../core/domain';
import {
  InaturalistEffects,
  InaturalistReader,
  InaturalistRecordKind,
  InaturalistSyncRunResult,
} from '../../core/ports';

interface InaturalistDependencies {
  readonly reader: InaturalistReader;
  readonly effects: InaturalistEffects;
  readonly codecs: {
    readonly observation: PersistenceCodec<ImportedObservation>;
    readonly catalog: PersistenceCodec<ImportedCatalogProfile>;
    readonly status: PersistenceCodec<InaturalistSyncStatus>;
  };
}

export interface ImportedAdministrationRecords {
  readonly observations: readonly ImportedObservation[];
  readonly catalog: readonly ImportedCatalogProfile[];
}

export class InaturalistModule {
  constructor(private readonly dependencies: InaturalistDependencies) {}

  async status(
    actor: User | undefined,
  ): Promise<Outcome<InaturalistSyncStatus | undefined>> {
    const denied = adminDenied(actor);
    if (denied) return denied;
    try {
      const document = await this.dependencies.reader.getStatus();
      return success(
        document
          ? this.dependencies.codecs.status.decode(document.id, document.data)
          : undefined,
      );
    } catch {
      return failure(
        'dependency_failure',
        'Could not load iNaturalist synchronization status',
      );
    }
  }

  async records(
    actor: User | undefined,
  ): Promise<Outcome<ImportedAdministrationRecords>> {
    const denied = adminDenied(actor);
    if (denied) return denied;
    try {
      const [observations, catalog] = await Promise.all([
        this.dependencies.reader.listObservations(true),
        this.dependencies.reader.listCatalog(true),
      ]);
      return success({
        observations: observations.map(({ id, data }) =>
          this.dependencies.codecs.observation.decode(id, data),
        ),
        catalog: catalog.map(({ id, data }) =>
          this.dependencies.codecs.catalog.decode(id, data),
        ),
      });
    } catch {
      return failure(
        'dependency_failure',
        'Could not load imported iNaturalist records',
      );
    }
  }

  async runNow(
    actor: User | undefined,
  ): Promise<Outcome<InaturalistSyncRunResult>> {
    const denied = adminDenied(actor);
    if (denied) return denied;
    try {
      const result = await this.dependencies.effects.runSync();
      return success(
        result,
        result.status === 'partial' || result.status === 'failed'
          ? [
              {
                code: 'partial_completion',
                message: `iNaturalist synchronization finished with status ${result.status}`,
              },
            ]
          : [],
      );
    } catch {
      return failure(
        'dependency_failure',
        'Could not start the iNaturalist synchronization',
      );
    }
  }

  async setVisibility(
    actor: User | undefined,
    kind: InaturalistRecordKind,
    id: number,
    visible: boolean,
    reason: string,
  ): Promise<Outcome<void>> {
    const denied = adminDenied(actor);
    if (denied) return denied;
    try {
      await this.dependencies.effects.moderate(
        kind,
        id,
        !visible,
        reason,
      );
      return success(undefined);
    } catch {
      return failure(
        'dependency_failure',
        `Could not ${visible ? 'restore' : 'hide'} the imported record`,
      );
    }
  }

  async updateCatalog(
    actor: User | undefined,
    id: number,
    overrides: CatalogOverride,
  ): Promise<Outcome<void>> {
    const denied = adminDenied(actor);
    if (denied) return denied;
    try {
      await this.dependencies.effects.updateCatalogOverrides(id, overrides);
      return success(undefined);
    } catch {
      return failure(
        'dependency_failure',
        'Could not update the imported catalog profile',
      );
    }
  }

  async linkCatalog(
    actor: User | undefined,
    id: number,
    localCatalogId?: string,
  ): Promise<Outcome<void>> {
    const denied = adminDenied(actor);
    if (denied) return denied;
    try {
      await this.dependencies.effects.linkCatalog(id, localCatalogId);
      return success(undefined);
    } catch {
      return failure(
        'dependency_failure',
        `Could not ${localCatalogId ? 'link' : 'unlink'} the catalog profile`,
      );
    }
  }
}

function adminDenied(actor: User | undefined): Outcome<never> | undefined {
  if (!actor) {
    return failure('unauthenticated', 'Sign in to manage iNaturalist data');
  }
  if (!canAccessRolePolicy(actor.role, roleAccessPolicies.manageInaturalist)) {
    return failure(
      'forbidden',
      roleAccessRequirement(roleAccessPolicies.manageInaturalist),
    );
  }
  return undefined;
}
