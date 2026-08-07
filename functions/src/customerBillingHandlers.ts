import { CustomerBillingService } from './customerBilling';

export interface CustomerBillingRequest<T = Record<string, unknown>> {
  readonly authUid?: string;
  readonly data?: T;
}

export type CustomerBillingUseCases = Pick<
  CustomerBillingService,
  | 'getSummary'
  | 'createSetupSession'
  | 'createPortalSession'
  | 'payOutstandingInvoice'
  | 'setCollectionMethod'
  | 'updateBillingEmail'
  | 'scheduleCancellation'
  | 'resumeSubscription'
>;

export const handleGetClubBillingSummary = (
  request: CustomerBillingRequest,
  service: CustomerBillingUseCases,
) => service.getSummary(request.authUid);

export const handleCreateClubBillingSetupSession = (
  request: CustomerBillingRequest<{ readonly returnUrl?: unknown }>,
  service: CustomerBillingUseCases,
) => service.createSetupSession(request.authUid, request.data?.returnUrl);

export const handleCreateClubBillingPortalSession = (
  request: CustomerBillingRequest<{ readonly returnUrl?: unknown }>,
  service: CustomerBillingUseCases,
) => service.createPortalSession(request.authUid, request.data?.returnUrl);

export const handlePayClubOutstandingInvoice = (
  request: CustomerBillingRequest,
  service: CustomerBillingUseCases,
) => service.payOutstandingInvoice(request.authUid);

export const handleSetClubCollectionMethod = (
  request: CustomerBillingRequest<{
    readonly method?: unknown;
    readonly returnUrl?: unknown;
  }>,
  service: CustomerBillingUseCases,
) =>
  service.setCollectionMethod(
    request.authUid,
    request.data?.method,
    request.data?.returnUrl,
  );

export const handleUpdateClubBillingEmail = (
  request: CustomerBillingRequest<{ readonly email?: unknown }>,
  service: CustomerBillingUseCases,
) => service.updateBillingEmail(request.authUid, request.data?.email);

export const handleScheduleClubCancellation = (
  request: CustomerBillingRequest,
  service: CustomerBillingUseCases,
) => service.scheduleCancellation(request.authUid);

export const handleResumeClubSubscription = (
  request: CustomerBillingRequest,
  service: CustomerBillingUseCases,
) => service.resumeSubscription(request.authUid);
