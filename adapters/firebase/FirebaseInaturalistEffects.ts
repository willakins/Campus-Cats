import { Functions, httpsCallable } from 'firebase/functions';

import {
  InaturalistEffects,
  InaturalistRecordKind,
  InaturalistSyncRunResult,
} from '../../core/ports';

export class FirebaseInaturalistEffects implements InaturalistEffects {
  constructor(private readonly functions: Functions) {}

  async runSync(): Promise<InaturalistSyncRunResult> {
    const response = await httpsCallable(this.functions, 'runInaturalistSync')(
      {},
    );
    return syncRunResult(response.data);
  }

  async moderate(
    kind: InaturalistRecordKind,
    id: number,
    hidden: boolean,
    reason: string,
  ): Promise<void> {
    await httpsCallable(this.functions, 'moderateInaturalistRecord')({
      kind,
      id,
      hidden,
      reason,
    });
  }

  async updateCatalogOverrides(
    id: number,
    overrides: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    const definedOverrides = Object.fromEntries(
      Object.entries(overrides).filter(([, value]) => value !== undefined),
    );
    await httpsCallable(this.functions, 'updateInaturalistCatalog')({
      id,
      overrides: definedOverrides,
    });
  }

  async linkCatalog(id: number, localCatalogId?: string): Promise<void> {
    await httpsCallable(this.functions, 'linkInaturalistCatalog')({
      id,
      localCatalogId: localCatalogId ?? null,
    });
  }
}

function syncRunResult(value: unknown): InaturalistSyncRunResult {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid iNaturalist synchronization response');
  }
  const data = value as Record<string, unknown>;
  if (
    (data.status !== 'success' &&
      data.status !== 'partial' &&
      data.status !== 'failed' &&
      data.status !== 'skipped') ||
    typeof data.runId !== 'string' ||
    !data.runId
  ) {
    throw new Error('Invalid iNaturalist synchronization response');
  }
  return { status: data.status, runId: data.runId };
}
