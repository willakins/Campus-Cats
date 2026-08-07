import {
  ClubDiscovery,
  ClubSetupDraft,
  ClubSetupReceipt,
  ClubSetupVerification,
  UniversitySearchResult,
  normalizeUniversityQuery,
  parseUniversitySearchResult,
} from '../../core/domain';
import { UniversityOnboardingPort } from '../../core/ports';

export class InMemoryUniversityOnboarding implements UniversityOnboardingPort {
  readonly #universities = new Map<string, UniversitySearchResult>();

  constructor(universities: readonly UniversitySearchResult[] = []) {
    universities.forEach((university) => {
      this.#universities.set(university.id, parseUniversitySearchResult(university));
    });
  }

  async search(query: string): Promise<readonly UniversitySearchResult[]> {
    const terms = normalizeUniversityQuery(query).split(' ');
    return [...this.#universities.values()].filter((university) => {
      const candidate = normalizeUniversityQuery(
        `${university.name} ${university.city} ${university.state}`,
      );
      return terms.every((term) => candidate.includes(term));
    });
  }

  async get(universityId: string): Promise<UniversitySearchResult | undefined> {
    return this.#universities.get(universityId);
  }

  async requestSetup(draft: ClubSetupDraft): Promise<ClubSetupReceipt> {
    return {
      requestId: `request-${draft.universityId}`,
      universityId: draft.universityId,
      maskedEmail: mask(draft.presidentEmail),
      expiresAt: '2026-08-08T12:00:00.000Z',
    };
  }

  async verifySetup(
    requestId: string,
    _token: string,
  ): Promise<ClubSetupVerification> {
    const universityId = requestId.replace(/^request-/, '');
    const university = this.#universities.get(universityId);
    if (!university?.club) throw new Error('Club setup has not been provisioned');
    return { university, passwordSetupSent: true };
  }

  mapUniversity(universityId: string, club: ClubDiscovery): void {
    const university = this.#universities.get(universityId);
    if (!university) throw new Error('University not found');
    this.#universities.set(
      universityId,
      parseUniversitySearchResult({ ...university, status: 'mapped', club }),
    );
  }
}

const mask = (email: string): string => {
  const [local, domain] = email.split('@');
  return `${local?.slice(0, 1) ?? ''}***@${domain ?? ''}`;
};
