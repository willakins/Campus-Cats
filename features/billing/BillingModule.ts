import {
  Outcome,
  User,
  canManageFeature,
  failure,
  success,
} from '../../core/domain';
import { BillingReader, BillingSummary } from '../../core/ports';

interface BillingDependencies {
  readonly reader: BillingReader;
}

export class BillingModule {
  constructor(private readonly dependencies: BillingDependencies) {}

  async summary(actor: User | undefined): Promise<Outcome<BillingSummary>> {
    if (!actor) {
      return failure('unauthenticated', 'Sign in to view app billing');
    }
    if (!canManageFeature(actor.role)) {
      return failure(
        'forbidden',
        'Only officers may view app billing',
      );
    }

    try {
      return success(await this.dependencies.reader.getSummary());
    } catch {
      return failure(
        'dependency_failure',
        'Could not load Google Cloud billing data',
      );
    }
  }
}
