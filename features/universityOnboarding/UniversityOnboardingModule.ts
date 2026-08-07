import {
  ClubSetupDraft,
  ClubSetupReceipt,
  ClubSetupVerification,
  Outcome,
  UniversitySearchResult,
  UniversitySelection,
  emailMatchesUniversity,
  failure,
  normalizeUniversityQuery,
  parseClubSetupDraft,
  parseUniversitySearchResult,
  parseUniversitySelection,
  success,
} from '../../core/domain';
import {
  UniversityOnboardingPort,
  UniversitySelectionStore,
} from '../../core/ports';

interface Dependencies {
  readonly gateway: UniversityOnboardingPort;
  readonly selections: UniversitySelectionStore;
}

export class UniversityOnboardingModule {
  constructor(private readonly dependencies: Dependencies) {}

  async search(query: string): Promise<Outcome<readonly UniversitySearchResult[]>> {
    const normalized = normalizeUniversityQuery(query);
    if (normalized.length < 2) return success([]);
    try {
      const results = await this.dependencies.gateway.search(normalized);
      return success(results.map(parseUniversitySearchResult));
    } catch {
      return failure('dependency_failure', 'Could not search universities');
    }
  }

  async get(universityId: string): Promise<Outcome<UniversitySearchResult>> {
    try {
      const university = await this.dependencies.gateway.get(universityId.trim());
      return university
        ? success(parseUniversitySearchResult(university))
        : failure('not_found', 'University not found');
    } catch {
      return failure('dependency_failure', 'Could not load the university');
    }
  }

  async select(result: UniversitySearchResult): Promise<Outcome<UniversitySelection>> {
    try {
      const university = parseUniversitySearchResult(result);
      const selection = parseUniversitySelection({
        universityId: university.id,
        universityName: university.name,
        clubId: university.club?.id,
      });
      await this.dependencies.selections.save(selection);
      return success(selection);
    } catch {
      return failure('dependency_failure', 'Could not save the university selection');
    }
  }

  async restoreSelection(): Promise<Outcome<UniversitySelection | undefined>> {
    try {
      return success(await this.dependencies.selections.load());
    } catch {
      return failure('dependency_failure', 'Could not restore the university selection');
    }
  }

  async refreshSelection(): Promise<Outcome<UniversitySelection | undefined>> {
    const restored = await this.restoreSelection();
    if (!restored.ok || !restored.value) return restored;
    const university = await this.get(restored.value.universityId);
    if (!university.ok) return university.error.code === 'not_found'
      ? success(undefined)
      : university;
    return this.select(university.value);
  }

  async clearSelection(): Promise<Outcome<void>> {
    try {
      await this.dependencies.selections.clear();
      return success(undefined);
    } catch {
      return failure('dependency_failure', 'Could not clear the university selection');
    }
  }

  async requestSetup(draft: ClubSetupDraft): Promise<Outcome<ClubSetupReceipt>> {
    let parsed: ClubSetupDraft;
    try {
      parsed = parseClubSetupDraft(draft);
    } catch {
      return failure(
        'validation',
        'Enter a club name, two six-digit colors, and a valid President email',
      );
    }
    const university = await this.get(parsed.universityId);
    if (!university.ok) return university;
    if (university.value.status !== 'unclaimed') {
      return failure(
        'conflict',
        university.value.status === 'mapped'
          ? 'This university already has a club'
          : 'Club setup is already pending for this university',
      );
    }
    if (!university.value.timezone || !university.value.emailDomains.length) {
      return failure(
        'forbidden',
        'This university cannot be claimed until its location and email domain are verified',
      );
    }
    if (!emailMatchesUniversity(parsed.presidentEmail, university.value.emailDomains)) {
      return failure(
        'validation',
        `Use a President email from ${university.value.emailDomains.join(' or ')}`,
      );
    }
    try {
      return success(await this.dependencies.gateway.requestSetup(parsed));
    } catch (error) {
      return failure(
        'dependency_failure',
        error instanceof Error ? error.message : 'Could not request club setup',
      );
    }
  }

  async verifySetup(
    requestId: string,
    token: string,
  ): Promise<Outcome<ClubSetupVerification>> {
    if (!requestId.trim() || !token.trim()) {
      return failure('validation', 'The verification link is incomplete');
    }
    try {
      const verified = await this.dependencies.gateway.verifySetup(requestId, token);
      const selection = await this.select(verified.university);
      if (!selection.ok) return selection;
      return success(verified);
    } catch (error) {
      return failure(
        'dependency_failure',
        error instanceof Error ? error.message : 'Could not verify club setup',
      );
    }
  }
}
