import { Functions } from 'firebase/functions';

import { DevelopmentUniversityOnboarding } from '../development/DevelopmentUniversityOnboarding';
import { FirebaseUniversityOnboarding } from './FirebaseUniversityOnboarding';

export const createUniversityOnboardingGateway = (
  functions: Functions,
  appEnvironment: string | undefined = process.env.EXPO_PUBLIC_APP_ENV,
) => {
  const firebase = new FirebaseUniversityOnboarding(functions);
  return appEnvironment === 'development'
    ? new DevelopmentUniversityOnboarding(firebase)
    : firebase;
};
