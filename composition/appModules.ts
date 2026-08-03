import { Timestamp } from 'firebase/firestore';

import { FirebaseDocumentStore } from '../adapters/firebase/FirebaseDocumentStore';
import { FirebaseMediaStore } from '../adapters/firebase/FirebaseMediaStore';
import { UuidGenerator } from '../adapters/runtime/UuidGenerator';
import { createFirestoreCodecs } from '../core/domain';
import { MediaCoordinator } from '../core/media';
import { SightingsModule } from '../features/sightings';
import { db, storage } from '../config/firebase';

export interface AppModules {
  readonly sightings: SightingsModule;
}

const documents = new FirebaseDocumentStore(db);
const media = new FirebaseMediaStore(storage);
const ids = new UuidGenerator();
const codecs = createFirestoreCodecs({ fromDate: Timestamp.fromDate });

export const appModules: AppModules = Object.freeze({
  sightings: new SightingsModule({
    documents,
    media,
    mediaCoordinator: new MediaCoordinator(media, ids),
    ids,
    codecs,
  }),
});
