import {
  ClubSetupDraft,
  ClubSetupReceipt,
  ClubSetupVerification,
  UniversitySearchResult,
} from '../../core/domain';
import { UniversityOnboardingPort } from '../../core/ports';

export class DevelopmentUniversityOnboarding
implements UniversityOnboardingPort {
  constructor(private readonly catalog: UniversityOnboardingPort) {}

  async search(query: string): Promise<readonly UniversitySearchResult[]> {
    return this.catalog.search(query);
  }

  async get(universityId: string): Promise<UniversitySearchResult | undefined> {
    return this.catalog.get(universityId);
  }

  async requestSetup(_draft: ClubSetupDraft): Promise<ClubSetupReceipt> {
    throw new Error('Development club provisioning is disabled');
  }

  async verifySetup(
    _requestId: string,
    _token: string,
  ): Promise<ClubSetupVerification> {
    throw new Error('Development club provisioning is disabled');
  }
}
