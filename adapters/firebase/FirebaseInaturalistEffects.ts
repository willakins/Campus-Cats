import { Functions, httpsCallable } from 'firebase/functions';

import {
  InaturalistEffects,
  InaturalistRecordKind,
} from '../../core/ports';

export class FirebaseInaturalistEffects implements InaturalistEffects {
  constructor(private readonly functions: Functions) {}

  async runSync(): Promise<unknown> {
    const response = await httpsCallable(this.functions, 'runInaturalistSync')(
      {},
    );
    return response.data;
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
    await httpsCallable(this.functions, 'updateInaturalistCatalog')({
      id,
      overrides,
    });
  }

  async linkCatalog(id: number, localCatalogId?: string): Promise<void> {
    await httpsCallable(this.functions, 'linkInaturalistCatalog')({
      id,
      localCatalogId: localCatalogId ?? null,
    });
  }
}
