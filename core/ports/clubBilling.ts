import {
  ClubAccess,
  ClubBillingSummary,
  CollectionMethod,
} from '../domain';

export interface BillingRedirect {
  readonly url: string;
}

export interface ClubBillingPort {
  observeAccess(
    clubId: string,
    onChange: (access: ClubAccess | undefined) => void,
    onError?: (error: unknown) => void,
  ): () => void;
  getSummary(): Promise<ClubBillingSummary>;
  createSetupSession(returnUrl: string): Promise<BillingRedirect>;
  createPortalSession(returnUrl: string): Promise<BillingRedirect>;
  payOutstandingInvoice(): Promise<BillingRedirect>;
  setCollectionMethod(
    method: CollectionMethod,
    returnUrl: string,
  ): Promise<BillingRedirect | undefined>;
  updateBillingEmail(email: string): Promise<void>;
  scheduleCancellation(): Promise<ClubAccess>;
  resumeSubscription(): Promise<ClubAccess>;
}
