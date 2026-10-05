import {
  Firestore,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import {
  DocumentData,
  DocumentStore,
  DocumentWrite,
  StoredDocument,
} from '../../core/ports';
import { InFlightReads } from './InFlightReads';

export class FirebaseDocumentStore implements DocumentStore {
  private readonly lists = new InFlightReads<readonly StoredDocument[]>();
  private readonly documents = new InFlightReads<StoredDocument | undefined>();

  constructor(
    private readonly firestore: Firestore,
    private readonly readScope: () => string = () => '',
  ) {}

  async list(collectionPath: string): Promise<readonly StoredDocument[]> {
    return this.lists.run(
      JSON.stringify([this.readScope(), collectionPath]),
      async () => {
        const snapshot = await getDocs(
          collection(this.firestore, collectionPath),
        );
        return snapshot.docs.map((snapshotDocument) => ({
          id: snapshotDocument.id,
          data: snapshotDocument.data(),
        }));
      },
    );
  }

  async listWhereEqual(
    collectionPath: string,
    fieldPath: string,
    value: string,
  ): Promise<readonly StoredDocument[]> {
    return this.lists.run(
      JSON.stringify([this.readScope(), collectionPath, fieldPath, value]),
      async () => {
        const snapshot = await getDocs(
          query(
            collection(this.firestore, collectionPath),
            where(fieldPath, '==', value),
          ),
        );
        return snapshot.docs.map((snapshotDocument) => ({
          id: snapshotDocument.id,
          data: snapshotDocument.data(),
        }));
      },
    );
  }

  async get(
    collectionPath: string,
    id: string,
  ): Promise<StoredDocument | undefined> {
    return this.documents.run(
      JSON.stringify([this.readScope(), collectionPath, id]),
      async () => {
        const snapshot = await getDoc(doc(this.firestore, collectionPath, id));
        return snapshot.exists()
          ? { id: snapshot.id, data: snapshot.data() }
          : undefined;
      },
    );
  }

  async put(
    collectionPath: string,
    id: string,
    data: DocumentData,
  ): Promise<void> {
    this.clearReads();
    try {
      await setDoc(doc(this.firestore, collectionPath, id), data);
    } finally {
      this.clearReads();
    }
  }

  async remove(collectionPath: string, id: string): Promise<void> {
    this.clearReads();
    try {
      await deleteDoc(doc(this.firestore, collectionPath, id));
    } finally {
      this.clearReads();
    }
  }

  async commit(writes: readonly DocumentWrite[]): Promise<void> {
    const batch = writeBatch(this.firestore);
    for (const write of writes) {
      const reference = doc(this.firestore, write.collection, write.id);
      if (write.operation === 'put') batch.set(reference, write.data);
      else batch.delete(reference);
    }
    this.clearReads();
    try {
      await batch.commit();
    } finally {
      this.clearReads();
    }
  }

  private clearReads(): void {
    this.lists.clear();
    this.documents.clear();
  }
}
