import {
  Outcome,
  User,
  failure,
  success,
} from '../../core/domain';
import {
  BillingProviderPresentation,
  BillingReader,
  BillingSummary,
} from '../../core/ports';

interface BillingDependencies {
  readonly reader: BillingReader;
  readonly presentation: BillingProviderPresentation;
}

export class BillingModule {
  constructor(private readonly dependencies: BillingDependencies) {}

  get presentation(): BillingProviderPresentation {
    return this.dependencies.presentation;
  }

  async summary(actor: User | undefined): Promise<Outcome<BillingSummary>> {
    if (!actor) {
      return failure('unauthenticated', 'Sign in to view app billing');
    }
    if (!actor.platformAdmin) {
      return failure(
        'forbidden',
        'Only platform administrators may view app billing',
      );
    }

    try {
      return success(await this.dependencies.reader.getSummary());
    } catch {
      return failure('dependency_failure', 'Could not load billing data');
    }
  }
}
