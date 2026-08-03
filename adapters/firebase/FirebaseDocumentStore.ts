import {
  Firestore,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';

import {
  DocumentData,
  DocumentStore,
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
}
