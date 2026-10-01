import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentDeleted } from 'firebase-functions/v2/firestore';

const CLEANUP_BATCH_SIZE = 400;

export interface CommentThreadStore {
  listIds(
    collection: string,
    targetKey: string,
    limit: number,
  ): Promise<readonly string[]>;
  remove(collection: string, ids: readonly string[]): Promise<void>;
}

export async function cleanupCommentThread(
  store: CommentThreadStore,
  collection: string,
  targetKey: string,
): Promise<void> {
  while (true) {
    const ids = await store.listIds(
      collection,
      targetKey,
      CLEANUP_BATCH_SIZE,
    );
    if (ids.length === 0) return;
    await store.remove(collection, ids);
  }
}

const firestoreCommentStore = (): CommentThreadStore => ({
  async listIds(collection, targetKey, limit) {
    const snapshot = await getFirestore()
      .collection(collection)
      .where('targetKey', '==', targetKey)
      .limit(limit)
      .get();
    return snapshot.docs.map(({ id }) => id);
  },
  async remove(collection, ids) {
    const firestore = getFirestore();
    const batch = firestore.batch();
    ids.forEach((id) => batch.delete(firestore.collection(collection).doc(id)));
    await batch.commit();
  },
});

const cleanup = (
  deletedCollection: string,
  commentCollection: string,
  kind: 'sighting' | 'catalog' | 'station',
  canonicalId: (documentId: string) => string = (documentId) => documentId,
  relatedCollections: readonly string[] = [],
) =>
  onDocumentDeleted(
    `clubs/{clubId}/${deletedCollection}/{documentId}`,
    async (event) => {
      const id = canonicalId(event.params.documentId);
      const store = scopedCommentStore(
        firestoreCommentStore(),
        event.params.clubId,
      );
      await Promise.all(
        [commentCollection, ...relatedCollections].map((collection) =>
          cleanupCommentThread(store, collection, `${kind}:${id}`),
        ),
      );
    },
  );

const scopedCommentStore = (
  store: CommentThreadStore,
  clubId: string,
): CommentThreadStore => ({
  listIds: (collection, targetKey, limit) =>
    store.listIds(`clubs/${clubId}/${collection}`, targetKey, limit),
  remove: (collection, ids) =>
    store.remove(`clubs/${clubId}/${collection}`, ids),
});

export const cleanupDeletedSightingComments = cleanup(
  'cat-sightings',
  'sighting-comments',
  'sighting',
);
export const cleanupDeletedImportedSightingComments = cleanup(
  'inaturalist-observations',
  'sighting-comments',
  'sighting',
  (documentId) => `inat-observation-${documentId}`,
  ['inaturalist-comment-moderation'],
);
export const cleanupDeletedCatalogComments = cleanup(
  'catalog',
  'catalog-comments',
  'catalog',
);
export const cleanupDeletedImportedCatalogComments = cleanup(
  'inaturalist-guide-profiles',
  'catalog-comments',
  'catalog',
  (documentId) => `inat-guide-${documentId}`,
);
export const cleanupDeletedStationComments = cleanup(
  'stations',
  'station-comments',
  'station',
);
