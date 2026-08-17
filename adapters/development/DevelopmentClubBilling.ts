import type {
  ClubAccess,
  ClubBillingSummary,
  CollectionMethod,
} from '../../core/domain';
import type { BillingRedirect, ClubBillingPort } from '../../core/ports';

const billingDisabled = (): never => {
  throw new Error('Billing is disabled in development');
};

export class DevelopmentClubBilling implements ClubBillingPort {
  constructor(private readonly accessSource: ClubBillingPort) {}

  observeAccess(
    clubId: string,
    onChange: (access: ClubAccess | undefined) => void,
    onError?: (error: unknown) => void,
  ): () => void {
    return this.accessSource.observeAccess(clubId, onChange, onError);
  }

  async getSummary(): Promise<ClubBillingSummary> {
    return billingDisabled();
  }

  async createSetupSession(_returnUrl: string): Promise<BillingRedirect> {
    return billingDisabled();
  }

  async createPortalSession(_returnUrl: string): Promise<BillingRedirect> {
    return billingDisabled();
  }

  async payOutstandingInvoice(): Promise<BillingRedirect> {
    return billingDisabled();
  }

  async setCollectionMethod(
    _method: CollectionMethod,
    _returnUrl: string,
  ): Promise<BillingRedirect | undefined> {
    return billingDisabled();
  }

  async updateBillingEmail(_email: string): Promise<void> {
    return billingDisabled();
  }

  async scheduleCancellation(): Promise<ClubAccess> {
    return billingDisabled();
  }

  async resumeSubscription(): Promise<ClubAccess> {
    return billingDisabled();
  }
}

export const createClubBillingGateway = (
  firebaseBilling: ClubBillingPort,
  appEnvironment: string | undefined = process.env.EXPO_PUBLIC_APP_ENV,
): ClubBillingPort =>
  appEnvironment === 'development'
    ? new DevelopmentClubBilling(firebaseBilling)
    : firebaseBilling;
