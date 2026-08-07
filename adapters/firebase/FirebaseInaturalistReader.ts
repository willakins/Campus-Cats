import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

import {
  InaturalistReader,
  StoredDocument,
} from '../../core/ports';
import { FirebaseTenantScope } from './FirebaseTenantScope';

const OBSERVATIONS = 'inaturalist-observations';
const CATALOG = 'inaturalist-guide-profiles';

export class FirebaseInaturalistReader implements InaturalistReader {
  constructor(
    private readonly firestore: Firestore,
    private readonly tenantScope: FirebaseTenantScope,
  ) {}

  listObservations(includeHidden: boolean): Promise<readonly StoredDocument[]> {
    return this.list(OBSERVATIONS, includeHidden);
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
    const snapshot = await getDoc(
      doc(
        this.firestore,
        this.tenantScope.collection('integration-state'),
        'inaturalist',
      ),
    );
    return snapshot.exists()
      ? { id: snapshot.id, data: snapshot.data() }
      : undefined;
  }

  private async list(
    collectionName: string,
    includeHidden: boolean,
  ): Promise<readonly StoredDocument[]> {
    const reference = collection(
      this.firestore,
      this.tenantScope.collection(collectionName),
    );
    const snapshot = await getDocs(
      includeHidden ? reference : query(reference, where('visible', '==', true)),
    );
    return snapshot.docs.map((document) => ({
      id: document.id,
      data: document.data(),
    }));
  }

  private async get(
    collectionName: string,
    id: number,
  ): Promise<StoredDocument | undefined> {
    const snapshot = await getDoc(
      doc(
        this.firestore,
        this.tenantScope.collection(collectionName),
        String(id),
      ),
    );
    return snapshot.exists()
      ? { id: snapshot.id, data: snapshot.data() }
      : undefined;
  }
}
