import { Timestamp } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

import { ExpoImageSelection } from '../adapters/expo/ExpoImageSelection';
import { ExpoSamlCredentialProvider } from '../adapters/firebase/ExpoSamlCredentialProvider';
import { FirebaseCallableEffects } from '../adapters/firebase/FirebaseCallableEffects';
import { FirebaseDocumentStore } from '../adapters/firebase/FirebaseDocumentStore';
import { FirebaseMediaStore } from '../adapters/firebase/FirebaseMediaStore';
import { FirebaseSession } from '../adapters/firebase/FirebaseSession';
import { FirebaseWhitelistSubmission } from '../adapters/firebase/FirebaseWhitelistSubmission';
import { RandomPasswordGenerator } from '../adapters/runtime/RandomPasswordGenerator';
import { UuidGenerator } from '../adapters/runtime/UuidGenerator';
import { SystemClock, createFirestoreCodecs } from '../core/domain';
import { MediaCoordinator } from '../core/media';
import { AnnouncementsModule } from '../features/announcements';
import { CatalogModule } from '../features/catalog';
import { ContactsModule } from '../features/contacts';
import { ImageSelectionModule } from '../features/imageSelection';
import { SessionModule } from '../features/session';
import { SightingsModule } from '../features/sightings';
import { StationsModule } from '../features/stations';
import { UsersModule } from '../features/users';
import { WhitelistModule } from '../features/whitelist';
import {
  app,
  auth,
  db,
  firebaseConfig,
  storage,
} from '../config/firebase';

export interface AppModules {
  readonly announcements: AnnouncementsModule;
  readonly catalog: CatalogModule;
  readonly contacts: ContactsModule;
  readonly imageSelection: ImageSelectionModule;
  readonly session: SessionModule;
  readonly sightings: SightingsModule;
  readonly stations: StationsModule;
  readonly users: UsersModule;
  readonly whitelist: WhitelistModule;
}

const documents = new FirebaseDocumentStore(db);
const media = new FirebaseMediaStore(storage);
const effects = new FirebaseCallableEffects(getFunctions(app));
const ids = new UuidGenerator();
const clock = new SystemClock();
const codecs = createFirestoreCodecs({ fromDate: Timestamp.fromDate });
const session = new FirebaseSession(
  auth,
  db,
  new ExpoSamlCredentialProvider(firebaseConfig),
);

export const appModules: AppModules = Object.freeze({
  announcements: new AnnouncementsModule({
    documents,
    media,
    mediaCoordinator: new MediaCoordinator(media, ids),
    effects,
    ids,
    clock,
    codecs,
  }),
  catalog: new CatalogModule({
    documents,
    media,
    mediaCoordinator: new MediaCoordinator(media, ids),
    ids,
    clock,
    codecs,
  }),
  contacts: new ContactsModule({ documents, ids, codecs }),
  imageSelection: new ImageSelectionModule({ images: new ExpoImageSelection() }),
  session: new SessionModule({ session }),
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
    clock,
    codecs,
  }),
  users: new UsersModule({ documents, effects, codecs }),
  whitelist: new WhitelistModule({
    documents,
    effects,
    passwords: new RandomPasswordGenerator(),
    submissions: new FirebaseWhitelistSubmission(getFunctions(app)),
    codecs,
  }),
});
