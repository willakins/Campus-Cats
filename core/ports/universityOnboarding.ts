import {
  ClubSetupDraft,
  ClubSetupReceipt,
  ClubSetupVerification,
  UniversitySearchResult,
  UniversitySelection,
} from '../domain';

export interface UniversityOnboardingPort {
  search(query: string): Promise<readonly UniversitySearchResult[]>;
  get(universityId: string): Promise<UniversitySearchResult | undefined>;
  requestSetup(draft: ClubSetupDraft): Promise<ClubSetupReceipt>;
  verifySetup(requestId: string, token: string): Promise<ClubSetupVerification>;
}

export interface UniversitySelectionStore {
  load(): Promise<UniversitySelection | undefined>;
  save(selection: UniversitySelection): Promise<void>;
  clear(): Promise<void>;
}
