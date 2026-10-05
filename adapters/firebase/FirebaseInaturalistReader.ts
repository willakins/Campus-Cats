import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

import { InaturalistReader, StoredDocument } from '../../core/ports';
import { FirebaseTenantScope } from './FirebaseTenantScope';
import { InFlightReads } from './InFlightReads';

const OBSERVATIONS = 'inaturalist-observations';
const CATALOG = 'inaturalist-guide-profiles';

export class FirebaseInaturalistReader implements InaturalistReader {
  private readonly lists = new InFlightReads<readonly StoredDocument[]>();
  private readonly documents = new InFlightReads<StoredDocument | undefined>();

  constructor(
    private readonly firestore: Firestore,
    private readonly tenantScope: FirebaseTenantScope,
    private readonly readScope: () => string = () => '',
  ) {}

  listObservations(includeHidden: boolean): Promise<readonly StoredDocument[]> {
    return this.list(OBSERVATIONS, includeHidden);
  }

  listObservationsByObserver(
    observerId: number,
  ): Promise<readonly StoredDocument[]> {
    if (!Number.isSafeInteger(observerId) || observerId <= 0) {
      return Promise.reject(new Error('Invalid iNaturalist observer ID'));
    }
    return this.list(OBSERVATIONS, false, observerId);
  }

  getObservation(id: number): Promise<StoredDocument | undefined> {
    return this.get(OBSERVATIONS, id);
  }

  listCatalog(includeHidden: boolean): Promise<readonly StoredDocument[]> {
    return this.list(CATALOG, includeHidden);
  }

  getCatalog(id: number): Promise<StoredDocument | undefined> {
    return this.get(CATALOG, id);
  }

  async getStatus(): Promise<StoredDocument | undefined> {
    return this.get('integration-state', 'inaturalist');
  }

  private async list(
    collectionName: string,
    includeHidden: boolean,
    observerId?: number,
  ): Promise<readonly StoredDocument[]> {
    const path = this.tenantScope.collection(collectionName);
    return this.lists.run(
      JSON.stringify([this.readScope(), path, includeHidden, observerId]),
      async () => {
        const reference = collection(this.firestore, path);
        const filters = includeHidden ? [] : [where('visible', '==', true)];
        if (observerId !== undefined)
          filters.push(where('observer.id', '==', observerId));
        const snapshot = await getDocs(
          filters.length ? query(reference, ...filters) : reference,
        );
        return snapshot.docs.map((document) => ({
          id: document.id,
          data: document.data(),
        }));
      },
    );
  }

  private async get(
    collectionName: string,
    id: number | string,
  ): Promise<StoredDocument | undefined> {
    const path = this.tenantScope.collection(collectionName);
    return this.documents.run(
      JSON.stringify([this.readScope(), path, String(id)]),
      async () => {
        const snapshot = await getDoc(doc(this.firestore, path, String(id)));
        return snapshot.exists()
          ? { id: snapshot.id, data: snapshot.data() }
          : undefined;
      },
    );
  }
}
