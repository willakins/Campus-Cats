import {
  DocumentData,
  DocumentStore,
  StoredDocument,
} from '../../core/ports';

type Operation = 'list' | 'get' | 'put' | 'remove';

export class InMemoryDocumentStore implements DocumentStore {
  readonly #collections = new Map<string, Map<string, DocumentData>>();
  readonly #failures = new Map<Operation, Error>();

  failNext(operation: Operation, error: Error): void {
    this.#failures.set(operation, error);
  }

  async list(collection: string): Promise<readonly StoredDocument[]> {
    this.maybeFail('list');
    return [...this.collection(collection).entries()]
      .map(([id, data]) => ({ id, data: { ...data } }))
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  async get(
    collection: string,
    id: string,
  ): Promise<StoredDocument | undefined> {
    this.maybeFail('get');
    const data = this.collection(collection).get(id);
    return data ? { id, data: { ...data } } : undefined;
  }

  async put(
    collection: string,
    id: string,
    data: DocumentData,
  ): Promise<void> {
    this.maybeFail('put');
    this.collection(collection).set(id, { ...data });
  }

  async remove(collection: string, id: string): Promise<void> {
    this.maybeFail('remove');
    this.collection(collection).delete(id);
  }

  private collection(name: string): Map<string, DocumentData> {
    const existing = this.#collections.get(name);
    if (existing) {
      return existing;
    }
    const created = new Map<string, DocumentData>();
    this.#collections.set(name, created);
    return created;
  }

  private maybeFail(operation: Operation): void {
    const failure = this.#failures.get(operation);
    if (failure) {
      this.#failures.delete(operation);
      throw failure;
    }
  }
}
