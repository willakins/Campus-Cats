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
import { FirebaseCallableEffects } from './FirebaseCallableEffects';
import { FirebaseDocumentStore } from './FirebaseDocumentStore';
import { FirebaseInaturalistEffects } from './FirebaseInaturalistEffects';
import { FirebaseInaturalistReader } from './FirebaseInaturalistReader';
import { FirebaseMediaStore } from './FirebaseMediaStore';
import { FirebaseSession } from './FirebaseSession';
import { FirebaseSurveySubmissionGateway } from './FirebaseSurveySubmissionGateway';
import { FirebaseWhitelistSubmission } from './FirebaseWhitelistSubmission';
import { firebaseBillingPresentation } from './firebaseBillingPresentation';

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
  return {
    documents: new FirebaseDocumentStore(db),
    media: new FirebaseMediaStore(storage),
    effects: new FirebaseCallableEffects(functions),
    billing: {
      reader: new FirebaseBillingReader(functions),
      presentation: firebaseBillingPresentation,
    },
    inaturalist: {
      reader: new FirebaseInaturalistReader(db),
      effects: new FirebaseInaturalistEffects(functions),
    },
    session: new FirebaseSession(
      auth,
      db,
      new ExpoSamlCredentialProvider(samlConfiguration),
    ),
    surveySubmissions: new FirebaseSurveySubmissionGateway(functions),
    whitelistSubmissions: new FirebaseWhitelistSubmission(functions),
    codecs: createPersistenceCodecs(firebaseDates),
  };
}
