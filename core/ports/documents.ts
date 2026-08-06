export type DocumentData = Readonly<Record<string, unknown>>;

export interface StoredDocument {
  readonly id: string;
  readonly data: DocumentData;
}

export type DocumentWrite =
  | {
      readonly operation: 'put';
      readonly collection: string;
      readonly id: string;
      readonly data: DocumentData;
    }
  | {
      readonly operation: 'remove';
      readonly collection: string;
      readonly id: string;
    };

export interface DocumentStore {
  list(collection: string): Promise<readonly StoredDocument[]>;
  listWhereEqual(
    collection: string,
    fieldPath: string,
    value: string,
  ): Promise<readonly StoredDocument[]>;
  get(collection: string, id: string): Promise<StoredDocument | undefined>;
  put(collection: string, id: string, data: DocumentData): Promise<void>;
  remove(collection: string, id: string): Promise<void>;
  commit(writes: readonly DocumentWrite[]): Promise<void>;
}
