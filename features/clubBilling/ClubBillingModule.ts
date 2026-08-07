import {
  ClubAccess,
  ClubBillingSummary,
  CollectionMethod,
  Outcome,
  Role,
  User,
  failure,
  success,
} from '../../core/domain';
import { BillingRedirect, ClubBillingPort } from '../../core/ports';

const manageDenied = (actor: User | undefined): Outcome<never> | undefined => {
  if (!actor) return failure('unauthenticated', 'Sign in to manage club billing');
  if (actor.role !== Role.President) {
    return failure('forbidden', 'Only the club President may manage billing');
  }
  return undefined;
};

export class ClubBillingModule {
  constructor(private readonly port: ClubBillingPort) {}

  observeAccess(
    actor: User,
    onChange: (access: ClubAccess | undefined) => void,
    onError?: (error: unknown) => void,
  ): () => void {
    return this.port.observeAccess(actor.clubId, onChange, onError);
  }

  async summary(
    actor: User | undefined,
  ): Promise<Outcome<ClubBillingSummary>> {
    const denied = manageDenied(actor);
    if (denied) return denied;
    try {
      return success(await this.port.getSummary());
    } catch {
      return failure('dependency_failure', 'Could not load club billing');
    }
  }

  async createSetupSession(
    actor: User | undefined,
    returnUrl: string,
  ): Promise<Outcome<BillingRedirect>> {
    return this.redirect(actor, () => this.port.createSetupSession(returnUrl));
  }

  async createPortalSession(
    actor: User | undefined,
    returnUrl: string,
  ): Promise<Outcome<BillingRedirect>> {
    return this.redirect(actor, () => this.port.createPortalSession(returnUrl));
  }

  async payOutstandingInvoice(
    actor: User | undefined,
  ): Promise<Outcome<BillingRedirect>> {
    return this.redirect(actor, () => this.port.payOutstandingInvoice());
  }

  async setCollectionMethod(
    actor: User | undefined,
    method: CollectionMethod,
    returnUrl: string,
  ): Promise<Outcome<BillingRedirect | undefined>> {
    const denied = manageDenied(actor);
    if (denied) return denied;
    try {
      return success(await this.port.setCollectionMethod(method, returnUrl));
    } catch {
      return failure('dependency_failure', 'Could not update the payment method');
    }
  }

  async updateBillingEmail(
    actor: User | undefined,
    email: string,
  ): Promise<Outcome<void>> {
    const denied = manageDenied(actor);
    if (denied) return denied;
    try {
      await this.port.updateBillingEmail(email);
      return success(undefined);
    } catch {
      return failure('dependency_failure', 'Could not update the billing contact');
    }
  }

  async scheduleCancellation(
    actor: User | undefined,
  ): Promise<Outcome<ClubAccess>> {
    return this.accessMutation(actor, () => this.port.scheduleCancellation());
  }

  async resumeSubscription(
    actor: User | undefined,
  ): Promise<Outcome<ClubAccess>> {
    return this.accessMutation(actor, () => this.port.resumeSubscription());
  }

  private async redirect(
    actor: User | undefined,
    action: () => Promise<BillingRedirect>,
  ): Promise<Outcome<BillingRedirect>> {
    const denied = manageDenied(actor);
    if (denied) return denied;
    try {
      return success(await action());
    } catch {
      return failure('dependency_failure', 'Could not open secure billing');
    }
  }

  private async accessMutation(
    actor: User | undefined,
    action: () => Promise<ClubAccess>,
  ): Promise<Outcome<ClubAccess>> {
    const denied = manageDenied(actor);
    if (denied) return denied;
    try {
      return success(await action());
    } catch {
      return failure('dependency_failure', 'Could not update the subscription');
    }
  }
}
