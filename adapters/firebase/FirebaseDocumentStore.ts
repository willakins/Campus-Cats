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
import type { FirebaseValidatedContentWriter } from './FirebaseValidatedContentWriter';

export class FirebaseDocumentStore implements DocumentStore {
  private readonly lists = new InFlightReads<readonly StoredDocument[]>();
  private readonly documents = new InFlightReads<StoredDocument | undefined>();

  constructor(
    private readonly firestore: Firestore,
    private readonly readScope: () => string = () => '',
    private readonly contentWriter?: Pick<
      FirebaseValidatedContentWriter,
      'createSurvey' | 'saveTags' | 'createContest'
    >,
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
      const surveyPath = /^clubs\/([^/]+)\/community-surveys$/.exec(
        collectionPath,
      );
      const tagsPath = /^clubs\/([^/]+)\/catalog-tag-settings$/.exec(
        collectionPath,
      );
      const votePath = /^clubs\/([^/]+)\/community-votes$/.exec(collectionPath);
      if (votePath && data.kind === 'contest') {
        if (!this.contentWriter)
          throw new Error(
            'Contest creation requires the validated server writer',
          );
        await this.contentWriter.createContest(votePath[1], id, data);
      } else if (tagsPath) {
        if (id !== 'catalog' || !this.contentWriter)
          throw new Error(
            'Tag configuration requires the validated server writer',
          );
        await this.contentWriter.saveTags(tagsPath[1], data.tags);
      } else if (surveyPath && data.status === 'open') {
        if (!this.contentWriter)
          throw new Error(
            'Survey creation requires the validated server writer',
          );
        await this.contentWriter.createSurvey(surveyPath[1], id, data);
      } else {
        await setDoc(doc(this.firestore, collectionPath, id), data);
      }
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
    const tagSettings = writes.find((write) =>
      /^clubs\/[^/]+\/catalog-tag-settings$/.test(write.collection),
    );
    if (tagSettings) {
      if (
        tagSettings.operation !== 'put' ||
        tagSettings.id !== 'catalog' ||
        !this.contentWriter
      ) {
        throw new Error(
          'Tag configuration requires the validated server writer',
        );
      }
      this.clearReads();
      try {
        await this.contentWriter.saveTags(
          tagSettings.collection.split('/')[1],
          tagSettings.data.tags,
          writes.filter((write) => write !== tagSettings),
        );
      } finally {
        this.clearReads();
      }
      return;
    }
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
