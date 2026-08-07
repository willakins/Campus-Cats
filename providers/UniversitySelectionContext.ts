import { createContext, useContext } from 'react';

import {
  ClubSetupVerification,
  Outcome,
  UniversitySearchResult,
  UniversitySelection,
} from '@/core/domain';

export interface UniversitySelectionContextValue {
  readonly selection: UniversitySelection | undefined;
  readonly university: UniversitySearchResult | undefined;
  readonly loading: boolean;
  readonly error: string | undefined;
  readonly selectUniversity: (
    university: UniversitySearchResult,
  ) => Promise<Outcome<UniversitySelection>>;
  readonly refreshUniversity: () => Promise<UniversitySearchResult | undefined>;
  readonly clearUniversity: () => Promise<void>;
  readonly verifySetup: (
    requestId: string,
    token: string,
  ) => Promise<Outcome<ClubSetupVerification>>;
}

export const UniversitySelectionContext =
  createContext<UniversitySelectionContextValue | undefined>(undefined);

export const useUniversitySelection = (): UniversitySelectionContextValue => {
  const context = useContext(UniversitySelectionContext);
  if (!context) {
    throw new Error(
      'useUniversitySelection must be used within UniversitySelectionProvider',
    );
  }
  return context;
};
