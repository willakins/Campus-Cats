import { StoredDocument } from './documents';

export type InaturalistRecordKind = 'observation' | 'catalog';

export interface InaturalistReader {
  listObservations(includeHidden: boolean): Promise<readonly StoredDocument[]>;
  getObservation(id: number): Promise<StoredDocument | undefined>;
  listCatalog(includeHidden: boolean): Promise<readonly StoredDocument[]>;
  getCatalog(id: number): Promise<StoredDocument | undefined>;
  getStatus(): Promise<StoredDocument | undefined>;
}

export interface InaturalistEffects {
  runSync(): Promise<unknown>;
  moderate(
    kind: InaturalistRecordKind,
    id: number,
    hidden: boolean,
    reason: string,
  ): Promise<void>;
  updateCatalogOverrides(
    id: number,
    overrides: Readonly<Record<string, unknown>>,
  ): Promise<void>;
  linkCatalog(id: number, localCatalogId?: string): Promise<void>;
}
