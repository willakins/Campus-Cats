import { Firestore, Timestamp, doc, onSnapshot } from 'firebase/firestore';
import { Functions, httpsCallable } from 'firebase/functions';

import {
  ClubAccess,
  ClubBillingSummary,
  CollectionMethod,
  parseClubAccess,
  parseClubBillingSummary,
} from '../../core/domain';
import { BillingRedirect, ClubBillingPort } from '../../core/ports';

type CallableResult = Readonly<Record<string, unknown>>;

const isoDate = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return (value.toDate() as Date).toISOString();
  }
  throw new Error('Expected a billing date');
};

export const normalizeClubAccess = (
  clubId: string,
  data: Record<string, unknown>,
): ClubAccess =>
  parseClubAccess({
    clubId,
    clubName: data.clubName,
    timezone: data.timezone,
    billingEnforcementEnabled: data.billingEnforcementEnabled,
    maintenanceMode: data.maintenanceMode ?? false,
    accessState: data.accessState,
    paymentStanding: data.paymentStanding,
    collectionMethod: data.collectionMethod,
    invoiceDueAt: isoDate(data.invoiceDueAt),
    graceEndsAt: isoDate(data.graceEndsAt),
    scheduledEndAt: isoDate(data.scheduledEndAt),
    suspensionReason: data.suspensionReason ?? undefined,
  });

const redirect = (value: unknown): BillingRedirect => {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('url' in value) ||
    typeof value.url !== 'string'
  ) {
    throw new Error('Billing provider did not return a redirect');
  }
  return { url: value.url };
};

export class FirebaseClubBilling implements ClubBillingPort {
  constructor(
    private readonly firestore: Firestore,
    private readonly functions: Functions,
  ) {}

  observeAccess(
    clubId: string,
    onChange: (access: ClubAccess | undefined) => void,
    onError: (error: unknown) => void = () => undefined,
  ): () => void {
    return onSnapshot(
      doc(this.firestore, 'clubs', clubId, 'access', 'public'),
      (snapshot) =>
        onChange(
          snapshot.exists()
            ? normalizeClubAccess(clubId, snapshot.data())
            : undefined,
        ),
      onError,
    );
  }

  async getSummary(): Promise<ClubBillingSummary> {
    const response = await httpsCallable<Record<string, never>, CallableResult>(
      this.functions,
      'getClubBillingSummary',
    )({});
    return parseClubBillingSummary(response.data);
  }

  async createSetupSession(returnUrl: string): Promise<BillingRedirect> {
    return this.callRedirect('createClubBillingSetupSession', { returnUrl });
  }

  async createPortalSession(returnUrl: string): Promise<BillingRedirect> {
    return this.callRedirect('createClubBillingPortalSession', { returnUrl });
  }

  async payOutstandingInvoice(): Promise<BillingRedirect> {
    return this.callRedirect('payClubOutstandingInvoice', {});
  }

  async setCollectionMethod(
    method: CollectionMethod,
    returnUrl: string,
  ): Promise<BillingRedirect | undefined> {
    const response = await httpsCallable<
      { readonly method: CollectionMethod; readonly returnUrl: string },
      CallableResult
    >(this.functions, 'setClubCollectionMethod')({ method, returnUrl });
    return response.data.url ? redirect(response.data) : undefined;
  }

  async updateBillingEmail(email: string): Promise<void> {
    await httpsCallable<{ readonly email: string }, CallableResult>(
      this.functions,
      'updateClubBillingEmail',
    )({ email });
  }

  async scheduleCancellation(): Promise<ClubAccess> {
    return this.callAccess('scheduleClubCancellation');
  }

  async resumeSubscription(): Promise<ClubAccess> {
    return this.callAccess('resumeClubSubscription');
  }

  private async callRedirect(
    name: string,
    data: Record<string, unknown>,
  ): Promise<BillingRedirect> {
    const response = await httpsCallable<Record<string, unknown>, CallableResult>(
      this.functions,
      name,
    )(data);
    return redirect(response.data);
  }

  private async callAccess(name: string): Promise<ClubAccess> {
    const response = await httpsCallable<Record<string, never>, CallableResult>(
      this.functions,
      name,
    )({});
    return parseClubAccess(response.data);
  }
}
