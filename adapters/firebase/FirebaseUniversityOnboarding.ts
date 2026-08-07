import { Functions, httpsCallable } from 'firebase/functions';

import {
  ClubSetupDraft,
  ClubSetupReceipt,
  ClubSetupVerification,
  UniversitySearchResult,
  parseClubSetupReceipt,
  parseClubSetupVerification,
  parseUniversitySearchResult,
} from '../../core/domain';
import { UniversityOnboardingPort } from '../../core/ports';

export class FirebaseUniversityOnboarding implements UniversityOnboardingPort {
  constructor(private readonly functions: Functions) {}

  async search(query: string): Promise<readonly UniversitySearchResult[]> {
    const result = await httpsCallable<
      { readonly query: string },
      readonly unknown[]
    >(this.functions, 'searchUniversities')({ query });
    return result.data.map(parseUniversitySearchResult);
  }

  async get(universityId: string): Promise<UniversitySearchResult | undefined> {
    const result = await httpsCallable<
      { readonly universityId: string },
      unknown | null
    >(this.functions, 'getUniversity')({ universityId });
    return result.data ? parseUniversitySearchResult(result.data) : undefined;
  }

  async requestSetup(draft: ClubSetupDraft): Promise<ClubSetupReceipt> {
    const result = await httpsCallable<ClubSetupDraft, unknown>(
      this.functions,
      'requestClubSetup',
    )(draft);
    return parseClubSetupReceipt(result.data);
  }

  async verifySetup(
    requestId: string,
    token: string,
  ): Promise<ClubSetupVerification> {
    const result = await httpsCallable<
      { readonly requestId: string; readonly token: string },
      unknown
    >(this.functions, 'verifyClubSetup')({ requestId, token });
    return parseClubSetupVerification(result.data);
  }
}
