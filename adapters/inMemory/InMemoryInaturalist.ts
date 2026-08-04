import {
  DocumentData,
  InaturalistEffects,
  InaturalistReader,
  InaturalistRecordKind,
  InaturalistSyncRunResult,
  StoredDocument,
} from '../../core/ports';

type ReadOperation =
  | 'listObservations'
  | 'getObservation'
  | 'listCatalog'
  | 'getCatalog'
  | 'getStatus';
type EffectOperation =
  | 'runSync'
  | 'moderate'
  | 'updateCatalogOverrides'
  | 'linkCatalog';

export class InMemoryInaturalistReader implements InaturalistReader {
  readonly observations = new Map<string, DocumentData>();
  readonly catalog = new Map<string, DocumentData>();
  status?: StoredDocument;
  readonly #failures = new Map<ReadOperation, Error>();

  failNext(operation: ReadOperation, error: Error): void {
    this.#failures.set(operation, error);
  }

  listObservations(includeHidden: boolean): Promise<readonly StoredDocument[]> {
    this.maybeFail('listObservations');
    return Promise.resolve(this.list(this.observations, includeHidden));
  }

  getObservation(id: number): Promise<StoredDocument | undefined> {
    this.maybeFail('getObservation');
    return Promise.resolve(this.get(this.observations, id));
  }

  listCatalog(includeHidden: boolean): Promise<readonly StoredDocument[]> {
    this.maybeFail('listCatalog');
    return Promise.resolve(this.list(this.catalog, includeHidden));
  }

  getCatalog(id: number): Promise<StoredDocument | undefined> {
    this.maybeFail('getCatalog');
    return Promise.resolve(this.get(this.catalog, id));
  }

  getStatus(): Promise<StoredDocument | undefined> {
    this.maybeFail('getStatus');
    return Promise.resolve(this.status);
  }

  private list(
    source: ReadonlyMap<string, DocumentData>,
    includeHidden: boolean,
  ): readonly StoredDocument[] {
    return [...source]
      .filter(([, data]) => includeHidden || data.visible === true)
      .map(([id, data]) => ({ id, data: { ...data } }));
  }

  private get(
    source: ReadonlyMap<string, DocumentData>,
    id: number,
  ): StoredDocument | undefined {
    const data = source.get(String(id));
    return data ? { id: String(id), data: { ...data } } : undefined;
  }

  private maybeFail(operation: ReadOperation): void {
    const failure = this.#failures.get(operation);
    if (failure) {
      this.#failures.delete(operation);
      throw failure;
    }
  }
}

export class InMemoryInaturalistEffects implements InaturalistEffects {
  readonly #mutableOperations: string[] = [];
  readonly #failures = new Map<EffectOperation, Error>();
  syncResult: InaturalistSyncRunResult = {
    status: 'success',
    runId: 'run-1',
  };

  get operations(): readonly string[] {
    return [...this.#mutableOperations];
  }

  failNext(operation: EffectOperation, error: Error): void {
    this.#failures.set(operation, error);
  }

  async runSync(): Promise<InaturalistSyncRunResult> {
    this.maybeFail('runSync');
    this.#mutableOperations.push('sync');
    return this.syncResult;
  }

  async moderate(
    kind: InaturalistRecordKind,
    id: number,
    hidden: boolean,
    reason: string,
  ): Promise<void> {
    this.maybeFail('moderate');
    this.#mutableOperations.push(
      `moderate:${kind}:${id}:${hidden}:${reason}`,
    );
  }

  async updateCatalogOverrides(
    id: number,
    overrides: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    this.maybeFail('updateCatalogOverrides');
    this.#mutableOperations.push(
      `override:${id}:${JSON.stringify(overrides)}`,
    );
  }

  async linkCatalog(id: number, localCatalogId?: string): Promise<void> {
    this.maybeFail('linkCatalog');
    this.#mutableOperations.push(`link:${id}:${localCatalogId ?? ''}`);
  }

  private maybeFail(operation: EffectOperation): void {
    const failure = this.#failures.get(operation);
    if (failure) {
      this.#failures.delete(operation);
      throw failure;
    }
  }
}
