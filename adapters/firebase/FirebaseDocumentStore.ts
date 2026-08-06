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

export class FirebaseDocumentStore implements DocumentStore {
  constructor(private readonly firestore: Firestore) {}

  async list(collectionPath: string): Promise<readonly StoredDocument[]> {
    const snapshot = await getDocs(collection(this.firestore, collectionPath));
    return snapshot.docs.map((snapshotDocument) => ({
      id: snapshotDocument.id,
      data: snapshotDocument.data(),
    }));
  }

  async listWhereEqual(
    collectionPath: string,
    fieldPath: string,
    value: string,
  ): Promise<readonly StoredDocument[]> {
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
  }

  async get(
    collectionPath: string,
    id: string,
  ): Promise<StoredDocument | undefined> {
    const snapshot = await getDoc(doc(this.firestore, collectionPath, id));
    return snapshot.exists()
      ? { id: snapshot.id, data: snapshot.data() }
      : undefined;
  }

  async put(
    collectionPath: string,
    id: string,
    data: DocumentData,
  ): Promise<void> {
    await setDoc(doc(this.firestore, collectionPath, id), data);
  }

  async remove(collectionPath: string, id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, collectionPath, id));
  }

  async commit(writes: readonly DocumentWrite[]): Promise<void> {
    const batch = writeBatch(this.firestore);
    for (const write of writes) {
      const reference = doc(this.firestore, write.collection, write.id);
      if (write.operation === 'put') batch.set(reference, write.data);
      else batch.delete(reference);
    }
    await batch.commit();
  }
}
