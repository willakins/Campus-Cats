import {
  InaturalistAccountLinkAuthorization,
  InaturalistAccountLinkStatus,
  Outcome,
  User,
  failure,
  success,
} from '../../core/domain';
import { ApplicationEffects } from '../../core/ports';

interface InaturalistAccountsDependencies {
  readonly effects: ApplicationEffects;
}

export class InaturalistAccountsModule {
  constructor(private readonly dependencies: InaturalistAccountsDependencies) {}

  async begin(
    actor: User | undefined,
  ): Promise<Outcome<InaturalistAccountLinkAuthorization>> {
    if (!actor) return failure('unauthenticated', 'Sign in to link iNaturalist');
    try {
      return success(
        await this.dependencies.effects.beginInaturalistAccountLink(),
      );
    } catch {
      return failure(
        'dependency_failure',
        'Could not start iNaturalist account linking',
      );
    }
  }

  async status(
    actor: User | undefined,
    attemptId?: string,
  ): Promise<Outcome<InaturalistAccountLinkStatus>> {
    if (!actor) return failure('unauthenticated', 'Sign in to view iNaturalist');
    try {
      return success(
        await this.dependencies.effects.getInaturalistAccountLinkStatus(
          attemptId,
        ),
      );
    } catch {
      return failure(
        'dependency_failure',
        'Could not load iNaturalist account status',
      );
    }
  }

  async unlink(actor: User | undefined): Promise<Outcome<void>> {
    if (!actor) return failure('unauthenticated', 'Sign in to unlink iNaturalist');
    try {
      await this.dependencies.effects.unlinkInaturalistAccount();
      return success(undefined);
    } catch {
      return failure(
        'dependency_failure',
        'Could not unlink the iNaturalist account',
      );
    }
  }
}
