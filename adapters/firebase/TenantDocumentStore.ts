import {
  DocumentData,
  DocumentStore,
  DocumentWrite,
  StoredDocument,
} from '../../core/ports';
import { FirebaseTenantScope } from './FirebaseTenantScope';

const GLOBAL_COLLECTIONS = new Set(['users']);

export class TenantDocumentStore implements DocumentStore {
  constructor(
    private readonly documents: DocumentStore,
    private readonly scope: FirebaseTenantScope,
  ) {}

  async list(collection: string): Promise<readonly StoredDocument[]> {
    if (collection === 'users') {
      const documents = await this.documents.listWhereEqual(
        collection,
        'clubId',
        this.scope.clubId,
      );
      return documents;
    }
    return this.documents.list(this.path(collection));
  }

  async listWhereEqual(
    collection: string,
    fieldPath: string,
    value: string,
  ): Promise<readonly StoredDocument[]> {
    const documents = await this.documents.listWhereEqual(
      this.path(collection),
      fieldPath,
      value,
    );
    return GLOBAL_COLLECTIONS.has(collection)
      ? documents.filter(({ data }) => data.clubId === this.scope.clubId)
      : documents;
  }

  async get(
    collection: string,
    id: string,
  ): Promise<StoredDocument | undefined> {
    const document = await this.documents.get(this.path(collection), id);
    if (
      document &&
      GLOBAL_COLLECTIONS.has(collection) &&
      document.data.clubId !== this.scope.clubId
    ) {
      return undefined;
    }
    return document;
  }

  put(collection: string, id: string, data: DocumentData): Promise<void> {
    return this.documents.put(this.path(collection), id, data);
  }

  remove(collection: string, id: string): Promise<void> {
    return this.documents.remove(this.path(collection), id);
  }

  commit(writes: readonly DocumentWrite[]): Promise<void> {
    return this.documents.commit(
      writes.map((write) => ({
        ...write,
        collection: this.path(write.collection),
      })),
    );
  }

  private path(collection: string): string {
    return GLOBAL_COLLECTIONS.has(collection)
      ? collection
      : this.scope.collection(collection);
  }
}
