import { z } from 'zod';

const isoDate = z.string().datetime({ offset: true });

export const clubAccessStateSchema = z.enum([
  'pending_setup',
  'enabled',
  'suspended',
]);
export const paymentStandingSchema = z.enum(['current', 'past_due']);
export const collectionMethodSchema = z.enum(['manual', 'automatic']);
export const suspensionReasonSchema = z.enum(['nonpayment', 'cancellation']);

export const clubAccessSchema = z.object({
  clubId: z.string().trim().min(1).max(120),
  clubName: z.string().trim().min(1).max(160),
  timezone: z.string().trim().min(1).max(100),
  billingEnforcementEnabled: z.boolean(),
  maintenanceMode: z.boolean().default(false),
  accessState: clubAccessStateSchema,
  paymentStanding: paymentStandingSchema,
  collectionMethod: collectionMethodSchema,
  invoiceDueAt: isoDate.optional(),
  graceEndsAt: isoDate.optional(),
  scheduledEndAt: isoDate.optional(),
  suspensionReason: suspensionReasonSchema.optional(),
});

export const billingInvoiceSchema = z.object({
  id: z.string().trim().min(1),
  number: z.string().trim().min(1).optional(),
  status: z.enum(['draft', 'open', 'paid', 'void', 'uncollectible']),
  currency: z.string().trim().length(3),
  amountDue: z.number().int().nonnegative(),
  amountPaid: z.number().int().nonnegative(),
  createdAt: isoDate,
  dueAt: isoDate.optional(),
  hostedInvoiceUrl: z.string().url().optional(),
});

export const clubBillingSummarySchema = clubAccessSchema.extend({
  billingEmail: z.string().trim().email(),
  currency: z.literal('usd'),
  outstandingBalance: z.number().int().nonnegative(),
  activityUnitPriceLabel: z.string().trim().min(1),
  mediaMegabytePriceLabel: z.string().trim().min(1),
  currentUsage: z.object({
    activityUnits: z.number().int().nonnegative(),
    mediaBytes: z.number().int().nonnegative(),
    periodStartsAt: isoDate,
    periodEndsAt: isoDate,
  }),
  invoices: z.array(billingInvoiceSchema).max(24),
  paymentMethodLabel: z.string().trim().min(1).optional(),
});

export type ClubAccessState = z.infer<typeof clubAccessStateSchema>;
export type PaymentStanding = z.infer<typeof paymentStandingSchema>;
export type CollectionMethod = z.infer<typeof collectionMethodSchema>;
export type SuspensionReason = z.infer<typeof suspensionReasonSchema>;
export type ClubAccess = Readonly<z.infer<typeof clubAccessSchema>>;
export type BillingInvoice = Readonly<z.infer<typeof billingInvoiceSchema>>;
export type ClubBillingSummary = Readonly<
  z.infer<typeof clubBillingSummarySchema>
>;

export const parseClubAccess = (value: unknown): ClubAccess =>
  Object.freeze(clubAccessSchema.parse(value));

export const parseClubBillingSummary = (value: unknown): ClubBillingSummary =>
  Object.freeze(clubBillingSummarySchema.parse(value));

export type ClubSubscriptionLabel =
  | 'Pending setup'
  | 'Paid'
  | 'Lapsed'
  | 'Ending'
  | 'No subscription';

export function clubSubscriptionLabel(
  access: ClubAccess,
): ClubSubscriptionLabel {
  if (access.accessState === 'pending_setup') return 'Pending setup';
  if (access.accessState === 'suspended') return 'No subscription';
  if (access.scheduledEndAt) return 'Ending';
  if (access.paymentStanding === 'past_due') return 'Lapsed';
  return 'Paid';
}

export function clubHasAppAccess(
  access: ClubAccess,
  now: Date = new Date(),
): boolean {
  if (access.maintenanceMode) return false;
  if (!access.billingEnforcementEnabled) return true;
  if (access.accessState !== 'enabled') return false;
  const deadline = [access.graceEndsAt, access.scheduledEndAt]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .reduce<number | undefined>(
      (earliest, value) =>
        earliest === undefined || value < earliest ? value : earliest,
      undefined,
    );
  return deadline === undefined || now.getTime() < deadline;
}
