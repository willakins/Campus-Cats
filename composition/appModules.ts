import { Timestamp } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

import { FirebaseCallableEffects } from '../adapters/firebase/FirebaseCallableEffects';
import { FirebaseDocumentStore } from '../adapters/firebase/FirebaseDocumentStore';
import { FirebaseMediaStore } from '../adapters/firebase/FirebaseMediaStore';
import { UuidGenerator } from '../adapters/runtime/UuidGenerator';
import { createFirestoreCodecs } from '../core/domain';
import { MediaCoordinator } from '../core/media';
import { SightingsModule } from '../features/sightings';
import { CatalogModule } from '../features/catalog';
import { StationsModule } from '../features/stations';
import { AnnouncementsModule } from '../features/announcements';
import { app, db, storage } from '../config/firebase';

export interface AppModules {
  readonly announcements: AnnouncementsModule;
  readonly catalog: CatalogModule;
  readonly sightings: SightingsModule;
  readonly stations: StationsModule;
}

const documents = new FirebaseDocumentStore(db);
const media = new FirebaseMediaStore(storage);
const effects = new FirebaseCallableEffects(getFunctions(app));
const ids = new UuidGenerator();
const codecs = createFirestoreCodecs({ fromDate: Timestamp.fromDate });

export const appModules: AppModules = Object.freeze({
  announcements: new AnnouncementsModule({
    documents,
    media,
    mediaCoordinator: new MediaCoordinator(media, ids),
    effects,
    ids,
    clock: { now: () => new Date() },
    codecs,
  }),
  catalog: new CatalogModule({
    documents,
    media,
    mediaCoordinator: new MediaCoordinator(media, ids),
    ids,
    clock: { now: () => new Date() },
    codecs,
  }),
  sightings: new SightingsModule({
    documents,
    media,
    mediaCoordinator: new MediaCoordinator(media, ids),
    ids,
    codecs,
  }),
  stations: new StationsModule({
    documents,
    media,
    mediaCoordinator: new MediaCoordinator(media, ids),
    ids,
    clock: { now: () => new Date() },
    codecs,
  }),
});
