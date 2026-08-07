import { randomUUID } from 'node:crypto';

import {
  DocumentData,
  FieldValue,
  Firestore,
  Timestamp,
} from 'firebase-admin/firestore';
import Stripe from 'stripe';

import { HandlerError } from './handlers';

export type ClubAccessState = 'pending_setup' | 'enabled' | 'suspended';
export type PaymentStanding = 'current' | 'past_due';
export type CollectionMethod = 'manual' | 'automatic';
export type SuspensionReason = 'nonpayment' | 'cancellation';

interface StoredClub {
  readonly id: string;
  readonly name: string;
  readonly timezone: string;
  readonly billingEmail: string;
  readonly billingEnforcementEnabled: boolean;
  readonly maintenanceMode: boolean;
  readonly accessState: ClubAccessState;
  readonly paymentStanding: PaymentStanding;
  readonly collectionMethod: CollectionMethod;
  readonly invoiceDueAt?: Date;
  readonly graceEndsAt?: Date;
  readonly scheduledEndAt?: Date;
  readonly suspensionReason?: SuspensionReason;
}

interface BillingActor {
  readonly id: string;
  readonly email: string;
  readonly clubId: string;
  readonly role: number;
}

interface BillingAccount {
  readonly customerId?: string;
  readonly subscriptionId?: string;
  readonly outstandingInvoiceId?: string;
  readonly outstandingInvoiceCreatedAt?: Date;
  readonly pendingCollectionMethod?: CollectionMethod;
  readonly collectionMethod: CollectionMethod;
  readonly suspensionReason?: SuspensionReason;
}

interface BillingConfig {
  readonly activityPriceLookupKey: string;
  readonly mediaPriceLookupKey: string;
  readonly activityMeterEventName: string;
  readonly mediaMeterEventName: string;
  readonly automaticTax: boolean;
  readonly webAppOrigin: string;
}

interface BillingDependencies {
  readonly firestore: Firestore;
  readonly stripe: Stripe;
  readonly config: BillingConfig;
  readonly notify: (
    club: StoredClub,
    subject: string,
    message: string,
  ) => Promise<void>;
  readonly now?: () => Date;
}

type AccessResponse = ReturnType<typeof accessResponse>;

const CLUBS = 'clubs';
const ACCOUNTS = 'billing-accounts';
const USAGE_EVENTS = 'billing-usage-events';
const STRIPE_EVENTS = 'stripe-events';
const USAGE_COLLECTION = 'billing-usage';
const INVOICE_RECONCILIATIONS = 'billing-invoice-reconciliations';

const ACTIVITY_COLLECTIONS = new Map<
  string,
  ReadonlySet<'create' | 'update' | 'delete'>
>([
  ['cat-sightings', new Set(['create', 'update', 'delete'])],
  ['catalog', new Set(['create', 'update', 'delete'])],
  ['announcements', new Set(['create', 'update', 'delete'])],
  ['community-events', new Set(['create', 'update', 'delete'])],
  ['stations', new Set(['create', 'update', 'delete'])],
  ['community-surveys', new Set(['create', 'update'])],
  ['survey-responses', new Set(['create'])],
  ['community-votes', new Set(['create'])],
  ['community-vote-nominees', new Set(['create'])],
  ['community-vote-ballots', new Set(['create'])],
]);

const MEDIA_COLLECTIONS = new Set([
  'cat-sightings',
  'catalog',
  'announcements',
  'community-events',
  'stations',
  'community-votes',
]);

export class CustomerBillingService {
  private readonly now: () => Date;

  constructor(private readonly dependencies: BillingDependencies) {
    this.now = dependencies.now ?? (() => new Date());
  }

  async getSummary(authUid: string | undefined) {
    const { club } = await this.requirePresident(authUid);
    const account = await this.account(club.id);
    const period = localMonthPeriod(this.now(), club.timezone);
    const usageSnapshot = await this.dependencies.firestore
      .collection(CLUBS)
      .doc(club.id)
      .collection(USAGE_COLLECTION)
      .doc(period.key)
      .get();
    const usage = usageSnapshot.data();
    if (account.customerId) requireBillingConfig(this.dependencies.config);
    const [prices, invoices, paymentMethodLabel] =
      account.customerId
        ? await Promise.all([
            this.usagePrices(),
            this.dependencies.stripe.invoices.list({
              customer: account.customerId,
              limit: 12,
            }),
            this.paymentMethodLabel(account),
          ])
        : [undefined, { data: [] }, undefined];

    return {
      ...accessResponse(club),
      billingEmail: club.billingEmail,
      currency: 'usd' as const,
      outstandingBalance: invoices.data
        .filter((invoice) => invoice.status === 'open')
        .reduce((sum, invoice) => sum + invoice.amount_remaining, 0),
      activityUnitPriceLabel: priceLabel(prices?.activity, 'activity unit'),
      mediaMegabytePriceLabel: priceLabel(prices?.media, 'MB'),
      currentUsage: {
        activityUnits: nonnegativeInteger(usage?.activityUnits),
        mediaBytes: nonnegativeInteger(usage?.mediaBytes),
        periodStartsAt: period.startsAt.toISOString(),
        periodEndsAt: period.endsAt.toISOString(),
      },
      invoices: invoices.data.map(serializeInvoice),
      ...(paymentMethodLabel ? { paymentMethodLabel } : {}),
    };
  }

  async createSetupSession(
    authUid: string | undefined,
    returnUrl: unknown,
  ): Promise<{ readonly url: string }> {
    const { actor, club } = await this.requirePresident(authUid);
    return this.createSetupSessionForMethod(
      actor,
      club,
      returnUrl,
      'automatic',
    );
  }

  private async createSetupSessionForMethod(
    actor: BillingActor,
    club: StoredClub,
    returnUrl: unknown,
    collectionMethod: CollectionMethod,
  ): Promise<{ readonly url: string }> {
    const safeReturnUrl = requiredReturnUrl(
      returnUrl,
      this.dependencies.config.webAppOrigin,
    );
    const account = await this.ensureCustomer(club, actor.email);
    const session = await this.dependencies.stripe.checkout.sessions.create({
      mode: 'setup',
      customer: account.customerId,
      payment_method_types: ['card'],
      billing_address_collection: 'required',
      tax_id_collection: { enabled: true },
      customer_update: { address: 'auto', name: 'auto' },
      setup_intent_data: {
        metadata: { clubId: club.id, purpose: 'club_billing' },
      },
      metadata: {
        clubId: club.id,
        purpose: 'activate_or_update_collection',
        collectionMethod,
      },
      success_url: appendResult(safeReturnUrl, 'success'),
      cancel_url: appendResult(safeReturnUrl, 'cancelled'),
    });
    if (!session.url) throw new Error('Stripe Checkout URL was not created');
    return { url: session.url };
  }

  async createPortalSession(
    authUid: string | undefined,
    returnUrl: unknown,
  ): Promise<{ readonly url: string }> {
    const { club } = await this.requirePresident(authUid);
    const account = await this.account(club.id);
    if (!account.customerId) {
      throw new HandlerError('failed-precondition', 'Complete billing setup first');
    }
    const session = await this.dependencies.stripe.billingPortal.sessions.create({
      customer: account.customerId,
      return_url: requiredReturnUrl(
        returnUrl,
        this.dependencies.config.webAppOrigin,
      ),
    });
    return { url: session.url };
  }

  async payOutstandingInvoice(
    authUid: string | undefined,
  ): Promise<{ readonly url: string }> {
    const { club } = await this.requirePresident(authUid);
    const account = await this.account(club.id);
    if (!account.customerId) {
      throw new HandlerError('failed-precondition', 'No billing account exists');
    }
    const invoice = account.outstandingInvoiceId
      ? await this.dependencies.stripe.invoices.retrieve(
          account.outstandingInvoiceId,
        )
      : (
          await this.dependencies.stripe.invoices.list({
            customer: account.customerId,
            status: 'open',
            limit: 1,
          })
        ).data[0];
    if (!invoice?.hosted_invoice_url) {
      throw new HandlerError('not-found', 'No payable invoice was found');
    }
    return { url: invoice.hosted_invoice_url };
  }

  async setCollectionMethod(
    authUid: string | undefined,
    method: unknown,
    returnUrl: unknown,
  ): Promise<{ readonly url?: string }> {
    const { actor, club } = await this.requirePresident(authUid);
    if (method !== 'manual' && method !== 'automatic') {
      throw new HandlerError('invalid-argument', 'Payment method is invalid');
    }
    if (
      club.accessState === 'suspended' &&
      club.suspensionReason === 'nonpayment'
    ) {
      throw new HandlerError(
        'failed-precondition',
        'Pay the outstanding invoice before changing payment collection',
      );
    }
    const account = await this.ensureCustomer(club, actor.email);
    if (
      !account.subscriptionId &&
      method === 'manual' &&
      !(await this.customerHasBillingDetails(account))
    ) {
      await this.dependencies.firestore.collection(ACCOUNTS).doc(club.id).set(
        {
          pendingCollectionMethod: 'manual',
          updatedAt: Timestamp.fromDate(this.now()),
        },
        { merge: true },
      );
      return this.createBillingDetailsPortal(account, returnUrl);
    }
    if (method === 'automatic' && !(await this.defaultPaymentMethod(account))) {
      return this.createSetupSessionForMethod(actor, club, returnUrl, method);
    }
    let subscriptionId = account.subscriptionId;
    const activating = !subscriptionId;
    if (subscriptionId) {
      await this.dependencies.stripe.subscriptions.update(
        subscriptionId,
        method === 'manual'
          ? { collection_method: 'send_invoice', days_until_due: 1 }
          : { collection_method: 'charge_automatically' },
      );
    } else {
      const subscription = await this.ensureSubscription(
        club,
        account.customerId,
        method,
      );
      subscriptionId = subscription.id;
    }
    await Promise.all([
      this.dependencies.firestore.collection(ACCOUNTS).doc(club.id).set(
        {
          collectionMethod: method,
          subscriptionId,
          pendingCollectionMethod: null,
          ...(activating ? { suspensionReason: null } : {}),
          updatedAt: Timestamp.fromDate(this.now()),
        },
        { merge: true },
      ),
      this.clubReference(club.id).set(
        {
          collectionMethod: method,
          ...(activating
            ? {
                billingEnforcementEnabled: true,
                accessState: 'enabled',
                paymentStanding: 'current',
                suspensionReason: null,
                scheduledEndAt: null,
              }
            : {}),
          updatedAt: Timestamp.fromDate(this.now()),
        },
        { merge: true },
      ),
    ]);
    await this.dependencies.notify(
      {
        ...club,
        accessState: activating ? 'enabled' : club.accessState,
        collectionMethod: method,
      },
      activating
        ? 'Campus Cats billing is active'
        : 'Campus Cats payment settings updated',
      activating
        ? `Your club subscription is active with ${method === 'manual' ? 'hosted monthly invoices' : 'automatic payments'}.`
        : `Future invoices will use ${method === 'manual' ? 'manual payment' : 'automatic payment'}. Existing invoice terms have not changed.`,
    );
    return {};
  }

  private async createBillingDetailsPortal(
    account: Required<Pick<BillingAccount, 'customerId'>> & BillingAccount,
    returnUrl: unknown,
  ): Promise<{ readonly url: string }> {
    const session = await this.dependencies.stripe.billingPortal.sessions.create({
      customer: account.customerId,
      return_url: requiredReturnUrl(
        returnUrl,
        this.dependencies.config.webAppOrigin,
      ),
    });
    return { url: session.url };
  }

  async scheduleCancellation(
    authUid: string | undefined,
  ): Promise<AccessResponse> {
    const { club } = await this.requirePresident(authUid);
    const account = await this.account(club.id);
    if (!account.subscriptionId) {
      throw new HandlerError('failed-precondition', 'No active subscription exists');
    }
    const subscription = await this.dependencies.stripe.subscriptions.update(
      account.subscriptionId,
      { cancel_at_period_end: true },
    );
    const scheduledEndAt = subscriptionPeriodEnd(subscription);
    await this.clubReference(club.id).set(
      {
        scheduledEndAt: Timestamp.fromDate(scheduledEndAt),
        updatedAt: Timestamp.fromDate(this.now()),
      },
      { merge: true },
    );
    await this.dependencies.notify(
      { ...club, scheduledEndAt },
      'Campus Cats cancellation scheduled',
      `Your subscription will end on ${scheduledEndAt.toLocaleDateString()} after the current usage period.`,
    );
    return accessResponse({ ...club, scheduledEndAt });
  }

  async updateBillingEmail(
    authUid: string | undefined,
    value: unknown,
  ): Promise<void> {
    const { club } = await this.requirePresident(authUid);
    const email = billingEmail(value);
    const account = await this.account(club.id);
    await Promise.all([
      this.clubReference(club.id).set(
        { billingEmail: email, updatedAt: Timestamp.fromDate(this.now()) },
        { merge: true },
      ),
      account.customerId
        ? this.dependencies.stripe.customers.update(account.customerId, { email })
        : Promise.resolve(),
    ]);
    await this.dependencies.notify(
      { ...club, billingEmail: email },
      'Campus Cats billing contact updated',
      `Billing notices will be sent to ${email} and the club President.`,
    );
  }

  async resumeSubscription(
    authUid: string | undefined,
  ): Promise<AccessResponse> {
    const { club } = await this.requirePresident(authUid);
    const account = await this.account(club.id);
    if (!account.subscriptionId) {
      throw new HandlerError('failed-precondition', 'No subscription can be resumed');
    }
    await this.dependencies.stripe.subscriptions.update(account.subscriptionId, {
      cancel_at_period_end: false,
    });
    await this.clubReference(club.id).set(
      {
        scheduledEndAt: null,
        suspensionReason: null,
        updatedAt: Timestamp.fromDate(this.now()),
      },
      { merge: true },
    );
    await this.dependencies.notify(
      { ...club, scheduledEndAt: undefined, suspensionReason: undefined },
      'Campus Cats cancellation removed',
      'Your club subscription will continue.',
    );
    return accessResponse({
      ...club,
      scheduledEndAt: undefined,
      suspensionReason: undefined,
    });
  }

  async handleWebhook(event: Stripe.Event): Promise<void> {
    if (!(await this.claimStripeEvent(event))) return;
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.checkoutCompleted(event.data.object, event.id);
          break;
        case 'customer.updated':
          await this.customerUpdated(event.data.object, event.id);
          break;
        case 'invoice.created':
          await this.invoiceCreated(event.data.object);
          break;
        case 'invoice.finalized':
        case 'invoice.payment_failed':
          await this.invoiceNeedsPayment(event.data.object, event.type);
          break;
        case 'invoice.paid':
          await this.invoicePaid(event.data.object, event.id);
          break;
        case 'customer.subscription.updated':
          await this.subscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.subscriptionDeleted(event.data.object);
          break;
        default:
          break;
      }
      await this.dependencies.firestore.collection(STRIPE_EVENTS).doc(event.id).set(
        { status: 'processed', processedAt: Timestamp.fromDate(this.now()) },
        { merge: true },
      );
    } catch (error) {
      await this.dependencies.firestore.collection(STRIPE_EVENTS).doc(event.id).set(
        {
          status: 'failed',
          failedAt: Timestamp.fromDate(this.now()),
          error: error instanceof Error ? error.message.slice(0, 500) : 'Unknown error',
        },
        { merge: true },
      );
      throw error;
    }
  }

  async recordActivity(input: {
    readonly eventId: string;
    readonly clubId: string;
    readonly collection: string;
    readonly operation: 'create' | 'update' | 'delete';
    readonly occurredAt: Date;
    readonly initiatedBy: 'user' | 'system';
    readonly actorId?: string;
  }): Promise<void> {
    if (input.initiatedBy !== 'user' || !input.actorId) return;
    if (!ACTIVITY_COLLECTIONS.get(input.collection)?.has(input.operation)) return;
    const club = await this.club(input.clubId);
    if (
      !club.billingEnforcementEnabled ||
      club.accessState !== 'enabled' ||
      (await this.clubReference(club.id).get()).data()?.billingMigrationMode === true
    ) {
      return;
    }
    await this.createUsageEvent({
      id: `firestore-${input.eventId}`,
      club,
      kind: 'activity_units',
      value: 1,
      occurredAt: input.occurredAt,
      source: `${input.collection}:${input.operation}`,
      initiatedBy: input.initiatedBy,
      actorId: input.actorId,
    });
  }

  async recordMedia(input: {
    readonly eventId: string;
    readonly objectName: string;
    readonly bytes: number;
    readonly occurredAt: Date;
  }): Promise<void> {
    const match = meteredMediaPath(input.objectName);
    if (!match || input.bytes <= 0) return;
    const club = await this.club(match.clubId);
    const snapshot = await this.clubReference(club.id).get();
    if (
      !club.billingEnforcementEnabled ||
      club.accessState !== 'enabled' ||
      snapshot.data()?.billingMigrationMode === true
    ) {
      return;
    }
    await this.createUsageEvent({
      id: `storage-${input.eventId}`,
      club,
      kind: 'media_bytes',
      value: Math.floor(input.bytes),
      occurredAt: input.occurredAt,
      source: input.objectName,
      initiatedBy: 'user',
    });
  }

  async dispatchPendingUsage(
    limit = 100,
    scope?: { readonly clubId: string; readonly periodKey: string },
  ): Promise<number> {
    let query = this.dependencies.firestore
      .collection(USAGE_EVENTS)
      .where('status', '==', 'pending');
    if (scope) {
      query = query
        .where('clubId', '==', scope.clubId)
        .where('periodKey', '==', scope.periodKey);
    }
    const snapshot = await query.limit(limit).get();
    let sent = 0;
    for (const document of snapshot.docs) {
      const data = document.data();
      const account = await this.account(String(data.clubId));
      if (!account.customerId) continue;
      try {
        await this.dependencies.stripe.billing.meterEvents.create({
          event_name:
            data.kind === 'media_bytes'
              ? this.dependencies.config.mediaMeterEventName
              : this.dependencies.config.activityMeterEventName,
          payload: {
            stripe_customer_id: account.customerId,
            value: String(data.value),
          },
          identifier: document.id,
          timestamp: Math.floor(timestampDate(data.occurredAt).getTime() / 1000),
        });
        await document.ref.update({
          status: 'sent',
          sentAt: Timestamp.fromDate(this.now()),
          attempts: nonnegativeInteger(data.attempts) + 1,
        });
        sent += 1;
      } catch (error) {
        await document.ref.update({
          attempts: nonnegativeInteger(data.attempts) + 1,
          lastAttemptAt: Timestamp.fromDate(this.now()),
          lastError:
            error instanceof Error ? error.message.slice(0, 500) : 'Unknown error',
        });
      }
    }
    return sent;
  }

  async reconcilePendingInvoices(limit = 20): Promise<number> {
    const reconciliations = await this.dependencies.firestore
      .collection(INVOICE_RECONCILIATIONS)
      .where('status', '==', 'pending')
      .limit(limit)
      .get();
    let finalized = 0;
    for (const reconciliation of reconciliations.docs) {
      const data = reconciliation.data();
      const clubId = optionalString(data.clubId);
      const periodKey = optionalString(data.periodKey);
      if (!clubId || !periodKey) {
        await reconciliation.ref.set(
          { status: 'failed', error: 'Invalid reconciliation scope' },
          { merge: true },
        );
        continue;
      }
      await this.dispatchPendingUsage(500, { clubId, periodKey });
      const [usage, events] = await Promise.all([
        this.dependencies.firestore
          .collection(CLUBS)
          .doc(clubId)
          .collection(USAGE_COLLECTION)
          .doc(periodKey)
          .get(),
        this.dependencies.firestore
          .collection(USAGE_EVENTS)
          .where('clubId', '==', clubId)
          .where('periodKey', '==', periodKey)
          .get(),
      ]);
      if (events.docs.some((event) => event.data().status !== 'sent')) continue;
      const expected = usage.data();
      const actual = events.docs.reduce(
        (total, event) => {
          const eventData = event.data();
          const kind = eventData.kind === 'media_bytes' ? 'mediaBytes' : 'activityUnits';
          return { ...total, [kind]: total[kind] + nonnegativeInteger(eventData.value) };
        },
        { activityUnits: 0, mediaBytes: 0 },
      );
      if (
        actual.activityUnits !== nonnegativeInteger(expected?.activityUnits) ||
        actual.mediaBytes !== nonnegativeInteger(expected?.mediaBytes)
      ) {
        continue;
      }
      const readyAfter = dateValue(data.readyAfter);
      if (readyAfter && readyAfter > this.now()) continue;
      const invoice = await this.dependencies.stripe.invoices.retrieve(
        reconciliation.id,
      );
      if (invoice.status === 'draft') {
        await this.dependencies.stripe.invoices.finalizeInvoice(invoice.id, {
          auto_advance: true,
        });
      }
      await reconciliation.ref.set(
        { status: 'complete', completedAt: Timestamp.fromDate(this.now()) },
        { merge: true },
      );
      finalized += 1;
    }
    return finalized;
  }

  async enforceDeadlines(): Promise<number> {
    const snapshot = await this.dependencies.firestore.collection(CLUBS).get();
    let changed = 0;
    for (const document of snapshot.docs) {
      const club = storedClub(document.id, document.data());
      if (!club.billingEnforcementEnabled || club.accessState !== 'enabled') continue;
      const now = this.now();
      if (club.scheduledEndAt && club.scheduledEndAt <= now) {
        await Promise.all([
          document.ref.set(
            {
              accessState: 'suspended',
              suspensionReason: 'cancellation',
              scheduledEndAt: null,
              updatedAt: Timestamp.fromDate(now),
            },
            { merge: true },
          ),
          this.dependencies.firestore.collection(ACCOUNTS).doc(club.id).set(
            {
              subscriptionId: null,
              suspensionReason: 'cancellation',
              updatedAt: Timestamp.fromDate(now),
            },
            { merge: true },
          ),
        ]);
        await this.dependencies.notify(
          { ...club, accessState: 'suspended', suspensionReason: 'cancellation' },
          'Campus Cats subscription ended',
          'Your club subscription has ended. The President can restart billing from the web app.',
        );
        changed += 1;
        continue;
      }
      const invoiceDueAt = dateValue(document.data().invoiceDueAt);
      if (
        club.paymentStanding === 'current' &&
        invoiceDueAt &&
        invoiceDueAt <= now
      ) {
        await document.ref.set(
          { paymentStanding: 'past_due', updatedAt: Timestamp.fromDate(now) },
          { merge: true },
        );
        await this.dependencies.notify(
          { ...club, paymentStanding: 'past_due' },
          'Campus Cats payment is overdue',
          `Your club's balance is overdue. Pay by ${club.graceEndsAt?.toLocaleDateString() ?? 'the end of the month'} to prevent suspension.`,
        );
        changed += 1;
      }
      const refreshed = await this.club(club.id);
      const reminderSentAt = dateValue(document.data().graceReminderSentAt);
      if (
        refreshed.paymentStanding === 'past_due' &&
        refreshed.graceEndsAt &&
        !reminderSentAt &&
        refreshed.graceEndsAt.getTime() - now.getTime() <= 3 * 24 * 60 * 60 * 1000 &&
        refreshed.graceEndsAt > now
      ) {
        await document.ref.set(
          { graceReminderSentAt: Timestamp.fromDate(now) },
          { merge: true },
        );
        await this.dependencies.notify(
          refreshed,
          'Campus Cats payment reminder',
          `Pay the overdue balance by ${refreshed.graceEndsAt.toLocaleDateString()} to prevent suspension.`,
        );
      }
      if (
        refreshed.paymentStanding === 'past_due' &&
        refreshed.graceEndsAt &&
        refreshed.graceEndsAt <= now
      ) {
        const account = await this.account(club.id);
        if (account.subscriptionId) {
          await this.dependencies.stripe.subscriptions.cancel(
            account.subscriptionId,
            {},
            { idempotencyKey: `suspend-${club.id}-${refreshed.graceEndsAt.toISOString()}` },
          );
        }
        await Promise.all([
          document.ref.set(
            {
              accessState: 'suspended',
              suspensionReason: 'nonpayment',
              scheduledEndAt: null,
              updatedAt: Timestamp.fromDate(now),
            },
            { merge: true },
          ),
          this.dependencies.firestore.collection(ACCOUNTS).doc(club.id).set(
            {
              subscriptionId: null,
              suspensionReason: 'nonpayment',
              updatedAt: Timestamp.fromDate(now),
            },
            { merge: true },
          ),
        ]);
        await this.dependencies.notify(
          { ...refreshed, accessState: 'suspended', suspensionReason: 'nonpayment' },
          'Campus Cats access suspended',
          'Your club has been suspended for nonpayment. Pay the outstanding invoice to restore access.',
        );
        changed += 1;
      }
    }
    return changed;
  }

  private async invoiceCreated(invoice: Stripe.Invoice): Promise<void> {
    const clubId = await this.clubIdForInvoice(invoice);
    if (!clubId || invoice.status !== 'draft') return;
    const club = await this.club(clubId);
    const period = previousLocalMonthPeriod(
      new Date(invoice.created * 1000),
      club.timezone,
    );
    await Promise.all([
      this.dependencies.stripe.invoices.update(invoice.id, {
        auto_advance: false,
      }),
      this.dependencies.firestore
        .collection(INVOICE_RECONCILIATIONS)
        .doc(invoice.id)
        .set(
          {
            clubId,
            periodKey: period.key,
            periodStartsAt: Timestamp.fromDate(period.startsAt),
            periodEndsAt: Timestamp.fromDate(period.endsAt),
            status: 'pending',
            readyAfter: Timestamp.fromMillis(this.now().getTime() + 5 * 60 * 1000),
            createdAt: Timestamp.fromDate(this.now()),
          },
          { merge: true },
        ),
    ]);
    await this.dispatchPendingUsage(500, { clubId, periodKey: period.key });
  }

  private async customerUpdated(
    customer: Stripe.Customer,
    eventId: string,
  ): Promise<void> {
    if (!customerHasRequiredBillingDetails(customer)) return;
    const accounts = await this.dependencies.firestore
      .collection(ACCOUNTS)
      .where('customerId', '==', customer.id)
      .limit(1)
      .get();
    const accountDocument = accounts.docs[0];
    if (!accountDocument) return;
    const account = await this.account(accountDocument.id);
    if (account.pendingCollectionMethod !== 'manual' || account.subscriptionId) return;
    const club = await this.club(accountDocument.id);
    const subscription = await this.createSubscription(
      club,
      customer.id,
      'manual',
      eventId,
    );
    await Promise.all([
      accountDocument.ref.set(
        {
          subscriptionId: subscription.id,
          collectionMethod: 'manual',
          pendingCollectionMethod: null,
          suspensionReason: null,
          updatedAt: Timestamp.fromDate(this.now()),
        },
        { merge: true },
      ),
      this.clubReference(club.id).set(
        {
          billingEnforcementEnabled: true,
          accessState: 'enabled',
          paymentStanding: 'current',
          collectionMethod: 'manual',
          suspensionReason: null,
          scheduledEndAt: null,
          updatedAt: Timestamp.fromDate(this.now()),
        },
        { merge: true },
      ),
    ]);
    await this.dependencies.notify(
      { ...club, accessState: 'enabled', collectionMethod: 'manual' },
      'Campus Cats billing is active',
      'Billing details are complete and hosted monthly invoices are active.',
    );
  }

  private async checkoutCompleted(
    session: Stripe.Checkout.Session,
    eventId: string,
  ): Promise<void> {
    const clubId = session.metadata?.clubId;
    if (!clubId || !session.customer) return;
    const club = await this.club(clubId);
    const customerId = stripeId(session.customer);
    const collectionMethod: CollectionMethod =
      session.metadata?.collectionMethod === 'manual' ? 'manual' : 'automatic';
    if (session.setup_intent) {
      const setupIntent = await this.dependencies.stripe.setupIntents.retrieve(
        stripeId(session.setup_intent),
      );
      if (setupIntent.payment_method) {
        await this.dependencies.stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: stripeId(setupIntent.payment_method),
          },
        });
      }
    }
    let account = await this.account(clubId);
    const activating = !account.subscriptionId;
    if (!account.subscriptionId) {
      const subscription = await this.createSubscription(
        club,
        customerId,
        collectionMethod,
        eventId,
      );
      account = { ...account, subscriptionId: subscription.id };
    } else {
      await this.dependencies.stripe.subscriptions.update(account.subscriptionId, {
        ...(collectionMethod === 'manual'
          ? { collection_method: 'send_invoice', days_until_due: 1 }
          : { collection_method: 'charge_automatically' }),
      });
    }
    await Promise.all([
      this.dependencies.firestore.collection(ACCOUNTS).doc(clubId).set(
        {
          customerId,
          subscriptionId: account.subscriptionId,
          collectionMethod,
          pendingCollectionMethod: null,
          ...(activating ? { suspensionReason: null } : {}),
          updatedAt: Timestamp.fromDate(this.now()),
        },
        { merge: true },
      ),
      this.clubReference(clubId).set(
        {
          billingEnforcementEnabled: true,
          collectionMethod,
          ...(activating
            ? {
                accessState: 'enabled',
                paymentStanding: 'current',
                graceEndsAt: null,
                invoiceDueAt: null,
                scheduledEndAt: null,
                suspensionReason: null,
              }
            : {}),
          updatedAt: Timestamp.fromDate(this.now()),
        },
        { merge: true },
      ),
    ]);
    await this.dependencies.notify(
      { ...club, accessState: 'enabled', paymentStanding: 'current' },
      activating
        ? 'Campus Cats billing is active'
        : 'Campus Cats payment settings updated',
      activating
        ? 'Billing setup is complete and your club subscription is active.'
        : `Future invoices will use ${collectionMethod === 'manual' ? 'manual payment' : 'automatic payment'}. Existing invoice terms have not changed.`,
    );
  }

  private async invoiceNeedsPayment(
    invoice: Stripe.Invoice,
    eventType: 'invoice.finalized' | 'invoice.payment_failed',
  ): Promise<void> {
    const currentInvoice = await this.dependencies.stripe.invoices.retrieve(
      invoice.id,
    );
    if (!invoiceNeedsCollection(currentInvoice)) return;
    const openInvoices = await this.dependencies.stripe.invoices.list({
      customer: stripeId(currentInvoice.customer),
      status: 'open',
      limit: 100,
    });
    if (
      openInvoices.data.some(
        (candidate) =>
          candidate.id !== currentInvoice.id &&
          invoiceNeedsCollection(candidate) &&
          invoiceIsAtLeastAsRecent(candidate, currentInvoice),
      )
    ) {
      return;
    }
    const clubId = await this.clubIdForInvoice(currentInvoice);
    if (!clubId) return;
    const club = await this.club(clubId);
    const account = await this.account(clubId);
    if (
      account.outstandingInvoiceId &&
      account.outstandingInvoiceId !== currentInvoice.id
    ) {
      const outstanding = await this.dependencies.stripe.invoices.retrieve(
        account.outstandingInvoiceId,
      );
      if (
        invoiceNeedsCollection(outstanding) &&
        invoiceIsAtLeastAsRecent(outstanding, currentInvoice)
      ) {
        return;
      }
    }
    const dueAt = endOfFirstLocalDay(
      new Date(currentInvoice.created * 1000),
      club.timezone,
    );
    const graceEndsAt = nextLocalMonthStart(dueAt, club.timezone);
    const paymentStanding = club.paymentStanding;
    await Promise.all([
      this.clubReference(clubId).set(
        {
          paymentStanding,
          invoiceDueAt: Timestamp.fromDate(dueAt),
          graceEndsAt: Timestamp.fromDate(graceEndsAt),
          graceReminderSentAt: null,
          updatedAt: Timestamp.fromDate(this.now()),
        },
        { merge: true },
      ),
      this.dependencies.firestore.collection(ACCOUNTS).doc(clubId).set(
        {
          outstandingInvoiceId: currentInvoice.id,
          outstandingInvoiceCreatedAt: Timestamp.fromMillis(
            currentInvoice.created * 1000,
          ),
          updatedAt: Timestamp.fromDate(this.now()),
        },
        { merge: true },
      ),
    ]);
    await this.dependencies.notify(
      { ...club, paymentStanding, graceEndsAt },
      eventType === 'invoice.payment_failed'
        ? 'Campus Cats payment failed'
        : 'Campus Cats invoice ready',
      `A ${formatMoney(currentInvoice.amount_remaining, currentInvoice.currency)} balance is due. Pay before ${graceEndsAt.toLocaleDateString()} to prevent suspension.`,
    );
  }

  private async invoicePaid(
    invoice: Stripe.Invoice,
    eventId: string,
  ): Promise<void> {
    const currentInvoice = await this.dependencies.stripe.invoices.retrieve(
      invoice.id,
    );
    if (currentInvoice.status !== 'paid' || currentInvoice.amount_remaining > 0) {
      return;
    }
    const clubId = await this.clubIdForInvoice(currentInvoice);
    if (!clubId) return;
    const club = await this.club(clubId);
    const account = await this.account(clubId);
    if (account.customerId) {
      const openInvoices = await this.dependencies.stripe.invoices.list({
        customer: account.customerId,
        status: 'open',
        limit: 100,
      });
      if (openInvoices.data.some(invoiceNeedsCollection)) return;
    }
    if (
      account.outstandingInvoiceId &&
      account.outstandingInvoiceId !== currentInvoice.id
    ) {
      const outstanding = await this.dependencies.stripe.invoices.retrieve(
        account.outstandingInvoiceId,
      );
      if (
        invoiceNeedsCollection(outstanding) &&
        invoiceIsAtLeastAsRecent(outstanding, currentInvoice)
      ) {
        return;
      }
    }
    let subscriptionId = account.subscriptionId;
    if (
      club.accessState === 'suspended' &&
      club.suspensionReason === 'nonpayment' &&
      account.customerId
    ) {
      const subscription = await this.createSubscription(
        club,
        account.customerId,
        account.collectionMethod,
        eventId,
      );
      subscriptionId = subscription.id;
    }
    const restore = club.suspensionReason !== 'cancellation';
    await Promise.all([
      this.clubReference(clubId).set(
        {
          paymentStanding: 'current',
          graceEndsAt: null,
          invoiceDueAt: null,
          ...(restore
            ? { accessState: 'enabled', suspensionReason: null }
            : {}),
          updatedAt: Timestamp.fromDate(this.now()),
        },
        { merge: true },
      ),
      this.dependencies.firestore.collection(ACCOUNTS).doc(clubId).set(
        {
          outstandingInvoiceId: null,
          outstandingInvoiceCreatedAt: null,
          ...(subscriptionId ? { subscriptionId } : {}),
          ...(restore ? { suspensionReason: null } : {}),
          updatedAt: Timestamp.fromDate(this.now()),
        },
        { merge: true },
      ),
    ]);
    await this.dependencies.notify(
      { ...club, paymentStanding: 'current' },
      restore ? 'Campus Cats access restored' : 'Campus Cats payment received',
      restore
        ? 'Payment was received and your club subscription is active.'
        : 'Your final payment was received. The cancelled subscription remains closed.',
    );
  }

  private async subscriptionUpdated(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const clubId = subscription.metadata.clubId;
    if (!clubId) return;
    const account = await this.account(clubId);
    if (account.subscriptionId && account.subscriptionId !== subscription.id) return;
    const scheduledEndAt = subscription.cancel_at_period_end
      ? subscriptionPeriodEnd(subscription)
      : undefined;
    await this.clubReference(clubId).set(
      {
        scheduledEndAt: scheduledEndAt
          ? Timestamp.fromDate(scheduledEndAt)
          : null,
        updatedAt: Timestamp.fromDate(this.now()),
      },
      { merge: true },
    );
  }

  private async subscriptionDeleted(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const clubId = subscription.metadata.clubId;
    if (!clubId) return;
    const account = await this.account(clubId);
    if (account.subscriptionId !== subscription.id) return;
    const club = await this.club(clubId);
    const reason = account.suspensionReason ?? 'cancellation';
    await Promise.all([
      this.clubReference(clubId).set(
        {
          accessState: 'suspended',
          suspensionReason: reason,
          scheduledEndAt: null,
          updatedAt: Timestamp.fromDate(this.now()),
        },
        { merge: true },
      ),
      this.dependencies.firestore.collection(ACCOUNTS).doc(clubId).set(
        {
          subscriptionId: null,
          suspensionReason: reason,
          updatedAt: Timestamp.fromDate(this.now()),
        },
        { merge: true },
      ),
    ]);
    await this.dependencies.notify(
      { ...club, accessState: 'suspended', suspensionReason: reason },
      'Campus Cats subscription ended',
      reason === 'nonpayment'
        ? 'Your club subscription ended after an unpaid balance. The President can pay the hosted invoice to restore access.'
        : 'Your cancelled club subscription has ended.',
    );
  }

  private async createSubscription(
    club: StoredClub,
    customerId: string,
    method: CollectionMethod,
    idempotencySeed: string,
  ): Promise<Stripe.Subscription> {
    const prices = await this.usagePrices();
    return this.dependencies.stripe.subscriptions.create(
      {
        customer: customerId,
        items: [
          { price: prices.activity.id },
          { price: prices.media.id },
        ],
        billing_cycle_anchor: Math.floor(
          nextLocalMonthStart(this.now(), club.timezone).getTime() / 1000,
        ),
        billing_mode: { type: 'flexible' },
        collection_method:
          method === 'manual' ? 'send_invoice' : 'charge_automatically',
        ...(method === 'manual' ? { days_until_due: 1 } : {}),
        automatic_tax: { enabled: this.dependencies.config.automaticTax },
        metadata: { clubId: club.id },
        proration_behavior: 'none',
      },
      { idempotencyKey: `club-subscription-${club.id}-${idempotencySeed}` },
    );
  }

  private async ensureSubscription(
    club: StoredClub,
    customerId: string,
    method: CollectionMethod,
  ): Promise<Stripe.Subscription> {
    const existing = await this.dependencies.stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    });
    const reusable = existing.data.find(
      (subscription) =>
        subscription.metadata.clubId === club.id &&
        ['active', 'past_due', 'unpaid'].includes(subscription.status),
    );
    if (reusable) return reusable;
    return this.createSubscription(club, customerId, method, randomUUID());
  }

  private async ensureCustomer(
    club: StoredClub,
    presidentEmail: string,
  ): Promise<Required<Pick<BillingAccount, 'customerId'>> & BillingAccount> {
    const account = await this.account(club.id);
    if (account.customerId) return { ...account, customerId: account.customerId };
    const customer = await this.dependencies.stripe.customers.create(
      {
        name: club.name,
        email: club.billingEmail || presidentEmail,
        metadata: { clubId: club.id },
      },
      { idempotencyKey: `club-customer-${club.id}` },
    );
    await this.dependencies.firestore.collection(ACCOUNTS).doc(club.id).set(
      {
        customerId: customer.id,
        collectionMethod: club.collectionMethod,
        createdAt: Timestamp.fromDate(this.now()),
        updatedAt: Timestamp.fromDate(this.now()),
      },
      { merge: true },
    );
    return { ...account, customerId: customer.id };
  }

  private async createUsageEvent(input: {
    readonly id: string;
    readonly club: StoredClub;
    readonly kind: 'activity_units' | 'media_bytes';
    readonly value: number;
    readonly occurredAt: Date;
    readonly source: string;
    readonly initiatedBy: 'user' | 'system';
    readonly actorId?: string;
  }): Promise<void> {
    const eventReference = this.dependencies.firestore
      .collection(USAGE_EVENTS)
      .doc(input.id);
    const periodKey = localMonthPeriod(
      input.occurredAt,
      input.club.timezone,
    ).key;
    const aggregateReference = this.dependencies.firestore
      .collection(CLUBS)
      .doc(input.club.id)
      .collection(USAGE_COLLECTION)
      .doc(periodKey);
    await this.dependencies.firestore.runTransaction(async (transaction) => {
      const existing = await transaction.get(eventReference);
      if (existing.exists) return;
      transaction.create(eventReference, {
        clubId: input.club.id,
        kind: input.kind,
        value: input.value,
        source: input.source.slice(0, 500),
        initiatedBy: input.initiatedBy,
        ...(input.actorId ? { actorId: input.actorId } : {}),
        occurredAt: Timestamp.fromDate(input.occurredAt),
        periodKey,
        status: 'pending',
        attempts: 0,
        createdAt: Timestamp.fromDate(this.now()),
      });
      transaction.set(
        aggregateReference,
        {
          activityUnits:
            input.kind === 'activity_units'
              ? increment(input.value)
              : increment(0),
          mediaBytes:
            input.kind === 'media_bytes'
              ? increment(input.value)
              : increment(0),
          updatedAt: Timestamp.fromDate(this.now()),
        },
        { merge: true },
      );
    });
  }

  private async claimStripeEvent(event: Stripe.Event): Promise<boolean> {
    const reference = this.dependencies.firestore
      .collection(STRIPE_EVENTS)
      .doc(event.id);
    return this.dependencies.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (snapshot.data()?.status === 'processed') return false;
      const claimedAt = dateValue(snapshot.data()?.claimedAt);
      if (
        snapshot.data()?.status === 'processing' &&
        claimedAt &&
        this.now().getTime() - claimedAt.getTime() < 5 * 60 * 1000
      ) {
        return false;
      }
      transaction.set(
        reference,
        {
          type: event.type,
          status: 'processing',
          claimedAt: Timestamp.fromDate(this.now()),
        },
        { merge: true },
      );
      return true;
    });
  }

  private async requirePresident(
    authUid: string | undefined,
  ): Promise<{ readonly actor: BillingActor; readonly club: StoredClub }> {
    if (!authUid) throw new HandlerError('unauthenticated', 'Sign in to manage billing');
    const snapshot = await this.dependencies.firestore
      .collection('users')
      .doc(authUid)
      .get();
    const data = snapshot.data();
    if (
      !snapshot.exists ||
      data?.banned === true ||
      data?.role !== 3 ||
      typeof data.email !== 'string' ||
      typeof data.clubId !== 'string'
    ) {
      throw new HandlerError(
        'permission-denied',
        'Only the club President may manage billing',
      );
    }
    const actor: BillingActor = {
      id: snapshot.id,
      email: data.email,
      clubId: data.clubId,
      role: data.role,
    };
    return { actor, club: await this.club(actor.clubId) };
  }

  private async club(clubId: string): Promise<StoredClub> {
    const snapshot = await this.clubReference(clubId).get();
    if (!snapshot.exists) throw new HandlerError('not-found', 'Club not found');
    return storedClub(snapshot.id, snapshot.data()!);
  }

  private async account(clubId: string): Promise<BillingAccount> {
    const snapshot = await this.dependencies.firestore
      .collection(ACCOUNTS)
      .doc(clubId)
      .get();
    const data = snapshot.data();
    return {
      customerId: optionalString(data?.customerId),
      subscriptionId: optionalString(data?.subscriptionId),
      outstandingInvoiceId: optionalString(data?.outstandingInvoiceId),
      outstandingInvoiceCreatedAt: dateValue(data?.outstandingInvoiceCreatedAt),
      pendingCollectionMethod:
        data?.pendingCollectionMethod === 'automatic' ||
        data?.pendingCollectionMethod === 'manual'
          ? data.pendingCollectionMethod
          : undefined,
      collectionMethod:
        data?.collectionMethod === 'automatic' ? 'automatic' : 'manual',
      suspensionReason:
        data?.suspensionReason === 'nonpayment' ||
        data?.suspensionReason === 'cancellation'
          ? data.suspensionReason
          : undefined,
    };
  }

  private async clubIdForInvoice(
    invoice: Stripe.Invoice,
  ): Promise<string | undefined> {
    const metadata = invoice.parent?.subscription_details?.metadata;
    if (metadata?.clubId) return metadata.clubId;
    const customerId = stripeId(invoice.customer);
    const snapshot = await this.dependencies.firestore
      .collection(ACCOUNTS)
      .where('customerId', '==', customerId)
      .limit(1)
      .get();
    return snapshot.docs[0]?.id;
  }

  private async defaultPaymentMethod(
    account: BillingAccount,
  ): Promise<string | undefined> {
    if (!account.customerId) return undefined;
    const customer = await this.dependencies.stripe.customers.retrieve(
      account.customerId,
    );
    if (customer.deleted) return undefined;
    return customer.invoice_settings.default_payment_method
      ? stripeId(customer.invoice_settings.default_payment_method)
      : undefined;
  }

  private async customerHasBillingDetails(
    account: BillingAccount,
  ): Promise<boolean> {
    if (!account.customerId) return false;
    const customer = await this.dependencies.stripe.customers.retrieve(
      account.customerId,
    );
    if (customer.deleted) return false;
    return customerHasRequiredBillingDetails(customer);
  }

  private async paymentMethodLabel(
    account: BillingAccount,
  ): Promise<string | undefined> {
    const paymentMethodId = await this.defaultPaymentMethod(account);
    if (!paymentMethodId) return undefined;
    const paymentMethod = await this.dependencies.stripe.paymentMethods.retrieve(
      paymentMethodId,
    );
    return paymentMethod.card
      ? `${paymentMethod.card.wallet?.type === 'apple_pay' ? 'Apple Pay · ' : ''}${paymentMethod.card.brand.toUpperCase()} ending in ${paymentMethod.card.last4}`
      : paymentMethod.type;
  }

  private async usagePrices(): Promise<{
    readonly activity: Stripe.Price;
    readonly media: Stripe.Price;
  }> {
    requireBillingConfig(this.dependencies.config);
    const [activity, media] = await Promise.all([
      this.dependencies.stripe.prices.list({
        lookup_keys: [this.dependencies.config.activityPriceLookupKey],
        active: true,
        limit: 1,
      }),
      this.dependencies.stripe.prices.list({
        lookup_keys: [this.dependencies.config.mediaPriceLookupKey],
        active: true,
        limit: 1,
      }),
    ]);
    const activityPrice = activity.data[0];
    const mediaPrice = media.data[0];
    if (!activityPrice || !mediaPrice) {
      throw new HandlerError(
        'failed-precondition',
        'Stripe usage prices could not be resolved by lookup key',
      );
    }
    await Promise.all([
      this.validateUsagePrice(
        activityPrice,
        this.dependencies.config.activityPriceLookupKey,
        this.dependencies.config.activityMeterEventName,
        false,
      ),
      this.validateUsagePrice(
        mediaPrice,
        this.dependencies.config.mediaPriceLookupKey,
        this.dependencies.config.mediaMeterEventName,
        true,
      ),
    ]);
    return { activity: activityPrice, media: mediaPrice };
  }

  private async validateUsagePrice(
    price: Stripe.Price,
    lookupKey: string,
    eventName: string,
    media: boolean,
  ): Promise<void> {
    const recurring = price.recurring;
    const meterId = recurring?.meter ? stripeId(recurring.meter) : undefined;
    const transform = price.transform_quantity;
    const transformValid = media
      ? transform?.divide_by === 1_000_000 && transform.round === 'up'
      : transform == null;
    if (
      price.lookup_key !== lookupKey ||
      price.currency !== 'usd' ||
      recurring?.interval !== 'month' ||
      recurring.usage_type !== 'metered' ||
      !meterId ||
      !transformValid
    ) {
      throw new HandlerError(
        'failed-precondition',
        `Stripe Price ${lookupKey} is not configured for monthly metered billing`,
      );
    }
    const meter = await this.dependencies.stripe.billing.meters.retrieve(meterId);
    if (
      meter.event_name !== eventName ||
      meter.default_aggregation.formula !== 'sum'
    ) {
      throw new HandlerError(
        'failed-precondition',
        `Stripe meter for ${lookupKey} must sum ${eventName} events`,
      );
    }
  }

  private clubReference(clubId: string) {
    return this.dependencies.firestore.collection(CLUBS).doc(clubId);
  }
}

export const activityOperationAllowed = (
  collection: string,
  operation: 'create' | 'update' | 'delete',
): boolean => Boolean(ACTIVITY_COLLECTIONS.get(collection)?.has(operation));

export const meteredMediaPath = (
  objectName: string,
): { readonly clubId: string; readonly collection: string } | undefined => {
  const match = /^clubs\/([^/]+)\/([^/]+)\/[^/]+\/[^/]+$/.exec(objectName);
  return match && MEDIA_COLLECTIONS.has(match[2])
    ? { clubId: match[1], collection: match[2] }
    : undefined;
};

export const invoiceNeedsCollection = (
  invoice: Pick<Stripe.Invoice, 'status' | 'amount_remaining'>,
): boolean => invoice.status === 'open' && invoice.amount_remaining > 0;

export const customerHasRequiredBillingDetails = (
  customer: Pick<Stripe.Customer, 'name' | 'email' | 'address'>,
): boolean =>
  Boolean(
    customer.name &&
      customer.email &&
      customer.address?.line1 &&
      customer.address.city &&
      customer.address.postal_code &&
      customer.address.country,
  );

export const invoiceIsAtLeastAsRecent = (
  candidate: Pick<Stripe.Invoice, 'created'>,
  other: Pick<Stripe.Invoice, 'created'>,
): boolean => candidate.created >= other.created;

function storedClub(id: string, data: DocumentData): StoredClub {
  if (
    typeof data.name !== 'string' ||
    typeof data.timezone !== 'string' ||
    typeof data.billingEmail !== 'string'
  ) {
    throw new HandlerError('internal', 'Stored club billing data is invalid');
  }
  return {
    id,
    name: data.name,
    timezone: data.timezone,
    billingEmail: data.billingEmail,
    billingEnforcementEnabled: data.billingEnforcementEnabled === true,
    maintenanceMode: data.maintenanceMode === true,
    accessState:
      data.accessState === 'pending_setup' ||
      data.accessState === 'enabled' ||
      data.accessState === 'suspended'
        ? data.accessState
        : 'pending_setup',
    paymentStanding:
      data.paymentStanding === 'past_due' ? 'past_due' : 'current',
    collectionMethod:
      data.collectionMethod === 'automatic' ? 'automatic' : 'manual',
    invoiceDueAt: dateValue(data.invoiceDueAt),
    graceEndsAt: dateValue(data.graceEndsAt),
    scheduledEndAt: dateValue(data.scheduledEndAt),
    suspensionReason:
      data.suspensionReason === 'nonpayment' ||
      data.suspensionReason === 'cancellation'
        ? data.suspensionReason
        : undefined,
  };
}

function accessResponse(club: StoredClub) {
  return {
    clubId: club.id,
    clubName: club.name,
    timezone: club.timezone,
    billingEnforcementEnabled: club.billingEnforcementEnabled,
    maintenanceMode: club.maintenanceMode,
    accessState: club.accessState,
    paymentStanding: club.paymentStanding,
    collectionMethod: club.collectionMethod,
    ...(club.invoiceDueAt
      ? { invoiceDueAt: club.invoiceDueAt.toISOString() }
      : {}),
    ...(club.graceEndsAt
      ? { graceEndsAt: club.graceEndsAt.toISOString() }
      : {}),
    ...(club.scheduledEndAt
      ? { scheduledEndAt: club.scheduledEndAt.toISOString() }
      : {}),
    ...(club.suspensionReason
      ? { suspensionReason: club.suspensionReason }
      : {}),
  };
}

function serializeInvoice(invoice: Stripe.Invoice) {
  return {
    id: invoice.id,
    ...(invoice.number ? { number: invoice.number } : {}),
    status: invoice.status ?? 'draft',
    currency: invoice.currency,
    amountDue: invoice.amount_due,
    amountPaid: invoice.amount_paid,
    createdAt: new Date(invoice.created * 1000).toISOString(),
    ...(invoice.due_date
      ? { dueAt: new Date(invoice.due_date * 1000).toISOString() }
      : {}),
    ...(invoice.hosted_invoice_url
      ? { hostedInvoiceUrl: invoice.hosted_invoice_url }
      : {}),
  };
}

function priceLabel(
  price: Stripe.Price | undefined,
  unit: string,
): string {
  if (!price) return `Rate configured before launch per ${unit}`;
  const amount = Number(price.unit_amount_decimal ?? price.unit_amount ?? 0);
  return `${new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currency.toUpperCase(),
    minimumFractionDigits: amount % 100 === 0 ? 2 : 4,
  }).format(amount / 100)} per ${unit}`;
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription): Date {
  const endsAt = Math.min(
    ...subscription.items.data.map(({ current_period_end }) => current_period_end),
  );
  if (!Number.isFinite(endsAt)) throw new Error('Subscription period is missing');
  return new Date(endsAt * 1000);
}

export function localMonthPeriod(date: Date, timezone: string) {
  const { year, month } = localDateParts(date, timezone);
  const startsAt = localDateToUtc(year, month, 1, 0, 0, 0, timezone);
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const endsAt = localDateToUtc(next.year, next.month, 1, 0, 0, 0, timezone);
  return {
    key: `${year}-${String(month).padStart(2, '0')}`,
    startsAt,
    endsAt,
  };
}

export function previousLocalMonthPeriod(date: Date, timezone: string) {
  const current = localMonthPeriod(date, timezone);
  return localMonthPeriod(new Date(current.startsAt.getTime() - 1), timezone);
}

export function nextLocalMonthStart(date: Date, timezone: string): Date {
  const { year, month } = localDateParts(date, timezone);
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  return localDateToUtc(next.year, next.month, 1, 0, 0, 0, timezone);
}

export function endOfFirstLocalDay(date: Date, timezone: string): Date {
  const { year, month } = localDateParts(date, timezone);
  return new Date(
    localDateToUtc(year, month, 2, 0, 0, 0, timezone).getTime() - 1,
  );
}

function localDateParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  };
}

function localDateToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timezone: string,
): Date {
  const target = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = target;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const actual = localDateParts(new Date(guess), timezone);
    const represented = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    guess -= represented - target;
  }
  return new Date(guess);
}

function requiredReturnUrl(value: unknown, webAppOrigin: string): string {
  if (typeof value !== 'string') {
    throw new HandlerError('invalid-argument', 'Return URL is required');
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new HandlerError('invalid-argument', 'Return URL is invalid');
  }
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    throw new HandlerError('invalid-argument', 'Return URL must use HTTPS');
  }
  let configured: URL;
  try {
    configured = new URL(webAppOrigin);
  } catch {
    throw new HandlerError(
      'failed-precondition',
      'The billing web origin has not been configured',
    );
  }
  if (parsed.hostname !== 'localhost' && parsed.origin !== configured.origin) {
    throw new HandlerError('invalid-argument', 'Return URL origin is not allowed');
  }
  return parsed.toString();
}

function appendResult(value: string, result: string): string {
  const url = new URL(value);
  url.searchParams.set('billing', result);
  return url.toString();
}

function dateValue(value: unknown): Date | undefined {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return new Date(value);
  return undefined;
}

function timestampDate(value: unknown): Date {
  const date = dateValue(value);
  if (!date) throw new Error('Stored usage timestamp is invalid');
  return date;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

function billingEmail(value: unknown): string {
  if (typeof value !== 'string') {
    throw new HandlerError('invalid-argument', 'Billing email is required');
  }
  const normalized = value.trim().toLowerCase();
  if (
    normalized.length > 320 ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)
  ) {
    throw new HandlerError('invalid-argument', 'Billing email is invalid');
  }
  return normalized;
}

function stripeId(value: string | { readonly id: string } | null): string {
  if (!value) throw new Error('Stripe object identity is missing');
  return typeof value === 'string' ? value : value.id;
}

function nonnegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

const increment = (value: number) => FieldValue.increment(value);

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function requireBillingConfig(config: BillingConfig): void {
  if (
    !config.activityPriceLookupKey ||
    !config.mediaPriceLookupKey ||
    !config.webAppOrigin
  ) {
    throw new HandlerError(
      'failed-precondition',
      'Stripe usage prices have not been configured',
    );
  }
}

export const billingCollectionNames = {
  accounts: ACCOUNTS,
  usageEvents: USAGE_EVENTS,
  stripeEvents: STRIPE_EVENTS,
  invoiceReconciliations: INVOICE_RECONCILIATIONS,
} as const;

export const newUsageEventId = (): string => randomUUID();
