import { ApplicationCodecs, Clock, IdGenerator } from '../core/domain';
import { MediaCoordinator } from '../core/media';
import {
  ApplicationEffects,
  BillingProviderPresentation,
  BillingReader,
  DocumentStore,
  ImageSelectionPort,
  InaturalistEffects,
  InaturalistReader,
  MediaStore,
  PasswordGenerator,
  SessionPort,
  SurveySubmissionGateway,
  WhitelistSubmissionPort,
} from '../core/ports';
import { AnnouncementsModule } from '../features/announcements';
import {
  AppSettingsModule,
  ContentContributors,
} from '../features/appSettings';
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

export interface AppBackend {
  readonly documents: DocumentStore;
  readonly media: MediaStore;
  readonly effects: ApplicationEffects;
  readonly billing: {
    readonly reader: BillingReader;
    readonly presentation: BillingProviderPresentation;
  };
  readonly inaturalist: {
    readonly reader: InaturalistReader;
    readonly effects: InaturalistEffects;
  };
  readonly session: SessionPort;
  readonly surveySubmissions: SurveySubmissionGateway;
  readonly whitelistSubmissions: WhitelistSubmissionPort;
  readonly codecs: ApplicationCodecs;
}

export interface AppRuntime {
  readonly images: ImageSelectionPort;
  readonly passwords: PasswordGenerator;
  readonly ids: IdGenerator;
  readonly clock: Clock;
}

export interface AppInfrastructure extends AppBackend, AppRuntime {}

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

export function createAppModules(
  infrastructure: AppInfrastructure,
): AppModules {
  const {
    billing,
    clock,
    codecs,
    documents,
    effects,
    ids,
    images,
    inaturalist,
    media,
    passwords,
    session,
    surveySubmissions,
    whitelistSubmissions,
  } = infrastructure;
  const mediaCoordinator = () => new MediaCoordinator(media, ids);
  const appSettings = new AppSettingsModule({
    documents,
    mediaCoordinator: mediaCoordinator(),
    codecs: { appSettings: codecs.appSettings },
    migrateContributorPrivacy: () => effects.migrateContributorPrivacy(),
  });
  const contributors = new ContentContributors({
    documents,
    settings: appSettings,
    codec: codecs.contentContributor,
  });

  return Object.freeze({
    announcements: new AnnouncementsModule({
      documents,
      media,
      mediaCoordinator: mediaCoordinator(),
      effects,
      ids,
      clock,
      codecs,
    }),
    appSettings,
    billing: new BillingModule(billing),
    catalog: new CatalogModule({
      documents,
      media,
      mediaCoordinator: mediaCoordinator(),
      ids,
      clock,
      contributors,
      codecs,
      imports: {
        reader: inaturalist.reader,
        codec: codecs.inaturalistCatalog,
      },
    }),
    contacts: new ContactsModule({ documents, ids, codecs }),
    events: new EventsModule({
      documents,
      media,
      mediaCoordinator: mediaCoordinator(),
      ids,
      clock,
      codec: codecs.clubEvent,
    }),
    imageSelection: new ImageSelectionModule({ images }),
    inaturalist: new InaturalistModule({
      reader: inaturalist.reader,
      effects: inaturalist.effects,
      codecs: {
        observation: codecs.inaturalistObservation,
        catalog: codecs.inaturalistCatalog,
        status: codecs.inaturalistStatus,
      },
    }),
    profiles: new ProfilesModule({
      documents,
      media,
      mediaCoordinator: mediaCoordinator(),
      effects,
      codecs,
    }),
    session: new SessionModule({ session }),
    sightings: new SightingsModule({
      documents,
      media,
      mediaCoordinator: mediaCoordinator(),
      ids,
      contributors,
      codecs,
      imports: {
        reader: inaturalist.reader,
        codec: codecs.inaturalistObservation,
      },
    }),
    stations: new StationsModule({
      documents,
      media,
      mediaCoordinator: mediaCoordinator(),
      ids,
      clock,
      codecs,
    }),
    surveys: new SurveysModule({
      documents,
      submission: surveySubmissions,
      ids,
      clock,
      codecs,
    }),
    users: new UsersModule({ documents, effects, codecs }),
    whitelist: new WhitelistModule({
      documents,
      effects,
      passwords,
      submissions: whitelistSubmissions,
      codecs,
    }),
  });
}
