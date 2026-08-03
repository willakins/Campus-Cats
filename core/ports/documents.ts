export type DocumentData = Readonly<Record<string, unknown>>;

export interface StoredDocument {
  readonly id: string;
  readonly data: DocumentData;
}

export interface DocumentStore {
  list(collection: string): Promise<readonly StoredDocument[]>;
  get(collection: string, id: string): Promise<StoredDocument | undefined>;
  put(collection: string, id: string, data: DocumentData): Promise<void>;
  remove(collection: string, id: string): Promise<void>;
}
