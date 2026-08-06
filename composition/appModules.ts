import { Timestamp } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

import { ExpoImageSelection } from '../adapters/expo/ExpoImageSelection';
import { FirebaseBillingReader } from '../adapters/firebase/FirebaseBillingReader';
import { ExpoSamlCredentialProvider } from '../adapters/firebase/ExpoSamlCredentialProvider';
import { FirebaseCallableEffects } from '../adapters/firebase/FirebaseCallableEffects';
import { FirebaseDocumentStore } from '../adapters/firebase/FirebaseDocumentStore';
import { FirebaseInaturalistEffects } from '../adapters/firebase/FirebaseInaturalistEffects';
import { FirebaseInaturalistReader } from '../adapters/firebase/FirebaseInaturalistReader';
import { FirebaseMediaStore } from '../adapters/firebase/FirebaseMediaStore';
import { FirebaseSession } from '../adapters/firebase/FirebaseSession';
import { FirebaseSurveySubmissionGateway } from '../adapters/firebase/FirebaseSurveySubmissionGateway';
import { FirebaseWhitelistSubmission } from '../adapters/firebase/FirebaseWhitelistSubmission';
import { RandomPasswordGenerator } from '../adapters/runtime/RandomPasswordGenerator';
import { UuidGenerator } from '../adapters/runtime/UuidGenerator';
import { SystemClock, createFirestoreCodecs } from '../core/domain';
import { MediaCoordinator } from '../core/media';
import { AnnouncementsModule } from '../features/announcements';
import { AppSettingsModule, ContentContributors } from '../features/appSettings';
import { BillingModule } from '../features/billing';
import { CatalogModule } from '../features/catalog';
import { ContactsModule } from '../features/contacts';
import { EventsModule } from '../features/events';
import { ImageSelectionModule } from '../features/imageSelection';
import { InaturalistModule } from '../features/inaturalist';
import { ProfilesModule } from '../features/profiles';
import { SessionModule } from '../features/session';
import { SightingsModule } from '../features/sightings';
import { StationsModule } from '../features/stations';
import { SurveysModule } from '../features/surveys';
import { UsersModule } from '../features/users';
import { WhitelistModule } from '../features/whitelist';
import {
  app,
  auth,
  db,
  samlConfiguration,
  storage,
} from '../config/firebase';

export interface AppModules {
  readonly announcements: AnnouncementsModule;
  readonly appSettings: AppSettingsModule;
  readonly billing: BillingModule;
  readonly catalog: CatalogModule;
  readonly contacts: ContactsModule;
  readonly events: EventsModule;
  readonly imageSelection: ImageSelectionModule;
  readonly inaturalist: InaturalistModule;
  readonly profiles: ProfilesModule;
  readonly session: SessionModule;
  readonly sightings: SightingsModule;
  readonly stations: StationsModule;
  readonly surveys: SurveysModule;
  readonly users: UsersModule;
  readonly whitelist: WhitelistModule;
}

const documents = new FirebaseDocumentStore(db);
const media = new FirebaseMediaStore(storage);
const functions = getFunctions(app);
const effects = new FirebaseCallableEffects(functions);
const billingReader = new FirebaseBillingReader(functions);
const inaturalistReader = new FirebaseInaturalistReader(db);
const inaturalistEffects = new FirebaseInaturalistEffects(functions);
const ids = new UuidGenerator();
const clock = new SystemClock();
const codecs = createFirestoreCodecs({ fromDate: Timestamp.fromDate });
const session = new FirebaseSession(
  auth,
  db,
  new ExpoSamlCredentialProvider(samlConfiguration),
);
const appSettings = new AppSettingsModule({
  documents,
  mediaCoordinator: new MediaCoordinator(media, ids),
  codecs: { appSettings: codecs.appSettings },
  migrateContributorPrivacy: () => effects.migrateContributorPrivacy(),
});
const contributors = new ContentContributors({
  documents,
  settings: appSettings,
  codec: codecs.contentContributor,
});

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
  appSettings,
  billing: new BillingModule({ reader: billingReader }),
  catalog: new CatalogModule({
    documents,
    media,
    mediaCoordinator: new MediaCoordinator(media, ids),
    ids,
    clock,
    contributors,
    codecs,
    imports: {
      reader: inaturalistReader,
      codec: codecs.inaturalistCatalog,
    },
  }),
  contacts: new ContactsModule({ documents, ids, codecs }),
  events: new EventsModule({
    documents,
    media,
    mediaCoordinator: new MediaCoordinator(media, ids),
    ids,
    clock,
    codec: codecs.clubEvent,
  }),
  imageSelection: new ImageSelectionModule({ images: new ExpoImageSelection() }),
  inaturalist: new InaturalistModule({
    reader: inaturalistReader,
    effects: inaturalistEffects,
    codecs: {
      observation: codecs.inaturalistObservation,
      catalog: codecs.inaturalistCatalog,
      status: codecs.inaturalistStatus,
    },
  }),
  profiles: new ProfilesModule({
    documents,
    media,
    mediaCoordinator: new MediaCoordinator(media, ids),
    effects,
    codecs,
  }),
  session: new SessionModule({ session }),
  sightings: new SightingsModule({
    documents,
    media,
    mediaCoordinator: new MediaCoordinator(media, ids),
    ids,
    contributors,
    codecs,
    imports: {
      reader: inaturalistReader,
      codec: codecs.inaturalistObservation,
    },
  }),
  stations: new StationsModule({
    documents,
    media,
    mediaCoordinator: new MediaCoordinator(media, ids),
    ids,
    clock,
    codecs,
  }),
  surveys: new SurveysModule({
    documents,
    submission: new FirebaseSurveySubmissionGateway(functions),
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
