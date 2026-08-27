import { Timestamp } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

import { createPersistenceCodecs } from '../../core/domain';
import type { AppBackend } from '../../composition/createAppModules';
import {
  app,
  auth,
  db,
  samlConfiguration,
  storage,
} from '../../config/firebase';
import { ExpoSamlCredentialProvider } from './ExpoSamlCredentialProvider';
import { FirebaseBillingReader } from './FirebaseBillingReader';
import { FirebaseClubBilling } from './FirebaseClubBilling';
import { FirebaseChatGateway } from './FirebaseChatGateway';
import { FirebaseCallableEffects } from './FirebaseCallableEffects';
import { FirebaseCommunityVotingGateway } from './FirebaseCommunityVotingGateway';
import { FirebaseDocumentStore } from './FirebaseDocumentStore';
import { FirebaseInaturalistEffects } from './FirebaseInaturalistEffects';
import { FirebaseInaturalistReader } from './FirebaseInaturalistReader';
import { FirebaseMediaStore } from './FirebaseMediaStore';
import { FirebaseSession } from './FirebaseSession';
import { FirebaseTenantScope } from './FirebaseTenantScope';
import { FirebaseSurveySubmissionGateway } from './FirebaseSurveySubmissionGateway';
import { FirebaseWhitelistSubmission } from './FirebaseWhitelistSubmission';
import { firebaseBillingPresentation } from './firebaseBillingPresentation';
import { createUniversityOnboardingGateway } from './createUniversityOnboardingGateway';
import { TenantDocumentStore } from './TenantDocumentStore';
import { TenantMediaStore } from './TenantMediaStore';
import { AsyncStorageUniversitySelection } from '../expo/AsyncStorageUniversitySelection';
import { createApplicationEffectsGateway } from '../development/DevelopmentApplicationEffects';
import { createClubBillingGateway } from '../development/DevelopmentClubBilling';
import { createSessionGateway } from '../development/DevelopmentSession';

const firebaseDates = {
  encode: (value: Date) => Timestamp.fromDate(value),
  decode: (value: unknown) => {
    if (!(value instanceof Timestamp)) {
      throw new Error('Expected a Firebase timestamp');
    }
    return value.toDate();
  },
};

export function createFirebaseBackend(): AppBackend {
  const functions = getFunctions(app);
  const codecs = createPersistenceCodecs(firebaseDates);
  const firebaseEffects = new FirebaseCallableEffects(functions);
  const firebaseClubBilling = new FirebaseClubBilling(db, functions);
  const tenantScope = new FirebaseTenantScope();
  const documents = new TenantDocumentStore(
    new FirebaseDocumentStore(db),
    tenantScope,
  );
  const media = new TenantMediaStore(
    new FirebaseMediaStore(storage),
    tenantScope,
  );
  return {
    documents,
    media,
    chat: new FirebaseChatGateway(db, functions, tenantScope, {
      message: codecs.chatMessage,
      reaction: codecs.chatReaction,
      restriction: codecs.chatRestriction,
      pingReadState: codecs.chatPingReadState,
    }),
    effects: createApplicationEffectsGateway(firebaseEffects),
    billing: {
      reader: new FirebaseBillingReader(functions),
      presentation: firebaseBillingPresentation,
    },
    clubBilling: createClubBillingGateway(firebaseClubBilling),
    inaturalist: {
      reader: new FirebaseInaturalistReader(db, tenantScope),
      effects: new FirebaseInaturalistEffects(functions),
    },
    session: createSessionGateway(
      new FirebaseSession(
        auth,
        db,
        new ExpoSamlCredentialProvider(samlConfiguration),
        tenantScope,
      ),
    ),
    surveySubmissions: new FirebaseSurveySubmissionGateway(functions),
    communityVoting: new FirebaseCommunityVotingGateway(functions),
    whitelistSubmissions: new FirebaseWhitelistSubmission(functions, tenantScope),
    universityOnboarding: createUniversityOnboardingGateway(functions),
    universitySelections: new AsyncStorageUniversitySelection(tenantScope),
    codecs,
  };
}
