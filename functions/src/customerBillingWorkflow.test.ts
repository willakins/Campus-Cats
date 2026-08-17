import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Firestore, Timestamp } from 'firebase-admin/firestore';
import Stripe from 'stripe';

import {
  CustomerBillingService,
  billingCollectionNames,
} from './customerBilling';

type Data = Record<string, unknown>;
type Filter = readonly [field: string, value: unknown];

class MemoryDocumentSnapshot {
  constructor(
    readonly ref: MemoryDocumentReference,
    private readonly value: Data | undefined,
  ) {}

  get id(): string {
    return this.ref.id;
  }

  get exists(): boolean {
    return this.value !== undefined;
  }

  data(): Data | undefined {
    return this.value;
  }
}

class MemoryDocumentReference {
  constructor(
    private readonly firestore: MemoryFirestore,
    readonly path: string,
  ) {}

  get id(): string {
    return this.path.split('/').at(-1)!;
  }

  collection(name: string): MemoryCollectionReference {
    return new MemoryCollectionReference(this.firestore, `${this.path}/${name}`);
  }

  async get(): Promise<MemoryDocumentSnapshot> {
    return new MemoryDocumentSnapshot(this, this.firestore.read(this.path));
  }

  async set(data: Data, options?: { readonly merge?: boolean }): Promise<void> {
    this.firestore.write(this.path, data, options?.merge === true);
  }

  async update(data: Data): Promise<void> {
    if (!this.firestore.read(this.path)) throw new Error(`Missing ${this.path}`);
    this.firestore.write(this.path, data, true);
  }
}

class MemoryQuery {
  constructor(
    protected readonly firestore: MemoryFirestore,
    protected readonly path: string,
    private readonly filters: readonly Filter[] = [],
    private readonly maximum?: number,
  ) {}

  where(field: string, operator: string, value: unknown): MemoryQuery {
    if (operator !== '==') throw new Error(`Unsupported operator ${operator}`);
    return new MemoryQuery(
      this.firestore,
      this.path,
      [...this.filters, [field, value]],
      this.maximum,
    );
  }

  limit(maximum: number): MemoryQuery {
    return new MemoryQuery(
      this.firestore,
      this.path,
      this.filters,
      maximum,
    );
  }

  async get() {
    const documents = this.firestore
      .documentsIn(this.path)
      .filter(({ data }) =>
        this.filters.every(([field, value]) => data[field] === value),
      )
      .slice(0, this.maximum);
    const docs = documents.map(
      ({ path, data }) =>
        new MemoryDocumentSnapshot(
          new MemoryDocumentReference(this.firestore, path),
          data,
        ),
    );
    return { docs, size: docs.length, empty: docs.length === 0 };
  }
}

class MemoryCollectionReference extends MemoryQuery {
  doc(id: string): MemoryDocumentReference {
    return new MemoryDocumentReference(this.firestore, `${this.path}/${id}`);
  }
}

class MemoryTransaction {
  async get(target: { readonly get: () => Promise<unknown> }): Promise<any> {
    return target.get();
  }

  set(
    reference: MemoryDocumentReference,
    data: Data,
    options?: { readonly merge?: boolean },
  ): void {
    reference.set(data, options);
  }

  create(reference: MemoryDocumentReference, data: Data): void {
    reference.set(data);
  }
}

class MemoryFirestore {
  private readonly documents = new Map<string, Data>();

  collection(path: string): MemoryCollectionReference {
    return new MemoryCollectionReference(this, path);
  }

  async runTransaction<T>(
    operation: (transaction: MemoryTransaction) => Promise<T>,
  ): Promise<T> {
    return operation(new MemoryTransaction());
  }

  seed(path: string, data: Data): void {
    this.documents.set(path, { ...data });
  }

  read(path: string): Data | undefined {
    return this.documents.get(path);
  }

  write(path: string, data: Data, merge: boolean): void {
    const previous = merge ? this.documents.get(path) ?? {} : {};
    this.documents.set(path, applyTransforms(previous, data));
  }

  documentsIn(collectionPath: string): readonly {
    readonly path: string;
    readonly data: Data;
  }[] {
    const depth = collectionPath.split('/').length + 1;
    return [...this.documents.entries()]
      .filter(
        ([path]) =>
          path.startsWith(`${collectionPath}/`) &&
          path.split('/').length === depth,
      )
      .map(([path, data]) => ({ path, data }));
  }
}

const applyTransforms = (previous: Data, update: Data): Data =>
  Object.fromEntries([
    ...Object.entries(previous),
    ...Object.entries(update).map(([key, value]) => {
      if (value?.constructor?.name === 'NumericIncrementTransform') {
        const operand = Number((value as { readonly operand: number }).operand);
        return [key, Number(previous[key] ?? 0) + operand];
      }
      return [key, value];
    }),
  ]);

const club = (overrides: Data = {}): Data => ({
  name: 'Alpha Cats',
  timezone: 'America/New_York',
  billingEmail: 'billing@example.com',
  billingEnforcementEnabled: true,
  maintenanceMode: false,
  accessState: 'enabled',
  paymentStanding: 'current',
  collectionMethod: 'manual',
  ...overrides,
});

const invoice = (overrides: Data = {}): Stripe.Invoice =>
  ({
    id: 'in_august',
    object: 'invoice',
    status: 'open',
    amount_remaining: 1_250,
    amount_due: 1_250,
    amount_paid: 0,
    currency: 'usd',
    created: Date.parse('2026-08-01T04:00:00.000Z') / 1_000,
    customer: 'cus_alpha',
    parent: {
      type: 'subscription_details',
      subscription_details: {
        metadata: { clubId: 'alpha' },
        subscription: 'sub_alpha',
      },
    },
    ...overrides,
  }) as unknown as Stripe.Invoice;

const event = (
  id: string,
  type: Stripe.Event.Type,
  object: unknown,
): Stripe.Event =>
  ({ id, type, data: { object } }) as unknown as Stripe.Event;

class MemoryStripe {
  readonly invoiceRecords = new Map<string, Stripe.Invoice>();
  readonly customerRecords = new Map<string, Stripe.Customer>();
  readonly subscriptionRecords = new Map<string, Stripe.Subscription>();
  readonly cancelledSubscriptions: string[] = [];
  readonly createdSubscriptions: Stripe.Subscription[] = [];
  readonly subscriptionRequests: Stripe.SubscriptionCreateParams[] = [];
  readonly finalizedInvoices: string[] = [];
  readonly updatedInvoices: string[] = [];
  readonly meterDeliveries: { readonly identifier?: string; readonly value?: string }[] = [];
  invoiceRetrievals = 0;
  meterFailures = 0;

  constructor(private readonly now: () => Date) {}

  readonly invoices = {
    retrieve: async (id: string) => {
      this.invoiceRetrievals += 1;
      const value = this.invoiceRecords.get(id);
      if (!value) throw new Error(`Missing invoice ${id}`);
      return value;
    },
    list: async (input: { readonly customer?: string; readonly status?: string }) => ({
      data: [...this.invoiceRecords.values()].filter(
        (value) =>
          (!input.customer || value.customer === input.customer) &&
          (!input.status || value.status === input.status),
      ),
    }),
    update: async (id: string) => {
      this.updatedInvoices.push(id);
      return this.invoiceRecords.get(id)!;
    },
    finalizeInvoice: async (id: string) => {
      this.finalizedInvoices.push(id);
      const value = this.invoiceRecords.get(id)!;
      const finalized = { ...value, status: 'open' as const };
      this.invoiceRecords.set(id, finalized);
      return finalized;
    },
  };

  readonly subscriptions = {
    create: async (input: Stripe.SubscriptionCreateParams) => {
      this.subscriptionRequests.push(input);
      const trialStartsAt = Math.floor(this.now().getTime() / 1_000);
      const trialEndsAt = input.trial_period_days
        ? trialStartsAt + input.trial_period_days * 24 * 60 * 60
        : null;
      const created = {
        id: `sub_created_${this.createdSubscriptions.length + 1}`,
        object: 'subscription',
        status: trialEndsAt ? 'trialing' : 'active',
        trial_start: trialEndsAt ? trialStartsAt : null,
        trial_end: trialEndsAt,
        metadata: input.metadata ?? {},
        items: {
          data: [{ current_period_end: input.billing_cycle_anchor ?? 1_788_240_000 }],
        },
      } as unknown as Stripe.Subscription;
      this.createdSubscriptions.push(created);
      this.subscriptionRecords.set(created.id, created);
      return created;
    },
    cancel: async (id: string) => {
      this.cancelledSubscriptions.push(id);
      return {
        id,
        metadata: { clubId: 'alpha' },
      } as unknown as Stripe.Subscription;
    },
    list: async () => ({ data: [...this.subscriptionRecords.values()] }),
    update: async (id: string) => ({
      id,
      metadata: { clubId: 'alpha' },
      items: { data: [{ current_period_end: 1_788_240_000 }] },
    }) as unknown as Stripe.Subscription,
  };

  readonly customers = {
    retrieve: async (id: string) => {
      const customer = this.customerRecords.get(id);
      if (!customer) throw new Error(`Missing customer ${id}`);
      return customer;
    },
  };

  readonly prices = {
    list: async (input: { readonly lookup_keys?: readonly string[] }) => {
      const lookupKey = input.lookup_keys?.[0] ?? '';
      const media = lookupKey === 'media';
      return {
        data: [
          {
            id: media ? 'price_media' : 'price_activity',
            lookup_key: lookupKey,
            currency: 'usd',
            unit_amount: 1,
            recurring: {
              interval: 'month',
              usage_type: 'metered',
              meter: media ? 'meter_media' : 'meter_activity',
            },
            transform_quantity: media
              ? { divide_by: 1_000_000, round: 'up' }
              : null,
          } as unknown as Stripe.Price,
        ],
      };
    },
  };

  readonly billing = {
    meters: {
      retrieve: async (id: string) => ({
        id,
        event_name: id === 'meter_media' ? 'media_bytes' : 'activity_units',
        default_aggregation: { formula: 'sum' },
      }),
    },
    meterEvents: {
      create: async (input: {
        readonly identifier?: string;
        readonly payload: { readonly value?: string };
      }) => {
        if (this.meterFailures > 0) {
          this.meterFailures -= 1;
          throw new Error('Temporary Stripe failure');
        }
        this.meterDeliveries.push({
          identifier: input.identifier,
          value: input.payload.value,
        });
        return { identifier: input.identifier };
      },
    },
  };
}

const setup = (
  now: Date,
  billingEmailsEnabled = true,
) => {
  const firestore = new MemoryFirestore();
  const notifications: string[] = [];
  const clock = { now };
  const stripe = new MemoryStripe(() => clock.now);
  const service = new CustomerBillingService({
    firestore: firestore as unknown as Firestore,
    stripe: stripe as unknown as Stripe,
    config: {
      activityPriceLookupKey: 'activity',
      mediaPriceLookupKey: 'media',
      activityMeterEventName: 'activity_units',
      mediaMeterEventName: 'media_bytes',
      automaticTax: true,
      webAppOrigin: 'https://app.example.com',
      billingEmailsEnabled,
    },
    notify: async (_club, subject) => {
      notifications.push(subject);
    },
    now: () => clock.now,
  });
  return { firestore, stripe, service, notifications, clock };
};

describe('customer billing workflows', () => {
  it('starts a first automatic subscription with one 30-day trial aligned to the next local month', async () => {
    const context = setup(new Date('2026-08-17T16:00:00.000Z'));
    context.firestore.seed('users/president-1', {
      email: 'president@example.com',
      role: 3,
      clubId: 'alpha',
    });
    context.firestore.seed(
      'clubs/alpha',
      club({ accessState: 'pending_setup', collectionMethod: 'manual' }),
    );
    context.firestore.seed('billing-accounts/alpha', {
      customerId: 'cus_alpha',
      collectionMethod: 'manual',
    });
    context.stripe.customerRecords.set('cus_alpha', {
      id: 'cus_alpha',
      object: 'customer',
      deleted: false,
      invoice_settings: { default_payment_method: 'pm_alpha' },
    } as unknown as Stripe.Customer);

    await context.service.setCollectionMethod(
      'president-1',
      'automatic',
      'https://app.example.com/settings/club-billing',
    );

    assert.equal(context.stripe.subscriptionRequests.length, 1);
    assert.equal(context.stripe.subscriptionRequests[0]!.trial_period_days, 30);
    assert.deepEqual(context.stripe.subscriptionRequests[0]!.trial_settings, {
      end_behavior: { missing_payment_method: 'cancel' },
    });
    assert.equal(
      context.stripe.subscriptionRequests[0]!.billing_cycle_anchor,
      Date.parse('2026-10-01T04:00:00.000Z') / 1_000,
    );
    assert.equal(
      (context.firestore.read('clubs/alpha')!.trialEndsAt as Timestamp)
        .toDate()
        .toISOString(),
      '2026-09-16T16:00:00.000Z',
    );
    assert.equal(
      (context.firestore.read('billing-accounts/alpha')!.trialStartedAt as Timestamp)
        .toDate()
        .toISOString(),
      '2026-08-17T16:00:00.000Z',
    );
    assert.equal(
      (context.firestore.read('clubs/alpha')!.trialUsageEndsAt as Timestamp)
        .toDate()
        .toISOString(),
      '2026-09-16T16:00:00.000Z',
    );
  });

  it('starts the trial when first-time Setup Checkout completes', async () => {
    const context = setup(new Date('2026-08-17T16:00:00.000Z'));
    context.firestore.seed(
      'clubs/alpha',
      club({ accessState: 'pending_setup', collectionMethod: 'manual' }),
    );
    context.firestore.seed('billing-accounts/alpha', {
      customerId: 'cus_alpha',
      collectionMethod: 'manual',
    });
    const session = {
      id: 'cs_trial',
      object: 'checkout.session',
      customer: 'cus_alpha',
      setup_intent: null,
      metadata: {
        clubId: 'alpha',
        purpose: 'activate_or_update_collection',
        collectionMethod: 'automatic',
      },
    } as unknown as Stripe.Checkout.Session;

    await context.service.handleWebhook(
      event('evt_checkout_trial', 'checkout.session.completed', session),
    );

    assert.equal(context.stripe.subscriptionRequests[0]!.trial_period_days, 30);
    assert.equal(context.firestore.read('clubs/alpha')!.accessState, 'enabled');
    assert.ok(context.firestore.read('clubs/alpha')!.trialEndsAt instanceof Timestamp);
    assert.ok(
      context.firestore.read('clubs/alpha')!.trialUsageEndsAt instanceof Timestamp,
    );
    assert.ok(
      context.firestore.read('billing-accounts/alpha')!.trialStartedAt instanceof Timestamp,
    );
  });

  it('does not meter usage before the trial ends', async () => {
    const context = setup(new Date('2026-08-17T16:00:00.000Z'));
    const trialEndsAt = new Date('2026-09-16T16:00:00.000Z');
    context.firestore.seed(
      'clubs/alpha',
      club({
        trialEndsAt: Timestamp.fromDate(trialEndsAt),
        trialUsageEndsAt: Timestamp.fromDate(trialEndsAt),
      }),
    );

    await context.service.recordActivity({
      eventId: 'during-trial',
      clubId: 'alpha',
      collection: 'cat-sightings',
      operation: 'create',
      occurredAt: new Date('2026-09-16T15:59:59.999Z'),
      initiatedBy: 'user',
      actorId: 'member-1',
    });
    assert.equal(
      context.firestore.read('clubs/alpha/billing-usage/2026-09'),
      undefined,
    );

    context.firestore.seed(
      'clubs/alpha',
      club({ trialEndsAt: null, trialUsageEndsAt: Timestamp.fromDate(trialEndsAt) }),
    );
    await context.service.recordActivity({
      eventId: 'delayed-trial-event',
      clubId: 'alpha',
      collection: 'cat-sightings',
      operation: 'create',
      occurredAt: new Date('2026-09-15T12:00:00.000Z'),
      initiatedBy: 'user',
      actorId: 'member-1',
    });
    assert.equal(
      context.firestore.read('clubs/alpha/billing-usage/2026-09'),
      undefined,
    );

    await context.service.recordActivity({
      eventId: 'after-trial',
      clubId: 'alpha',
      collection: 'cat-sightings',
      operation: 'create',
      occurredAt: trialEndsAt,
      initiatedBy: 'user',
      actorId: 'member-1',
    });
    assert.equal(
      context.firestore.read('clubs/alpha/billing-usage/2026-09')!.activityUnits,
      1,
    );
  });

  it('never grants a second trial after a club has used one', async () => {
    const context = setup(new Date('2026-11-03T15:00:00.000Z'));
    context.firestore.seed('users/president-1', {
      email: 'president@example.com',
      role: 3,
      clubId: 'alpha',
    });
    context.firestore.seed(
      'clubs/alpha',
      club({ accessState: 'suspended', suspensionReason: 'cancellation' }),
    );
    context.firestore.seed('billing-accounts/alpha', {
      customerId: 'cus_alpha',
      collectionMethod: 'automatic',
      trialStartedAt: Timestamp.fromDate(new Date('2026-08-17T16:00:00.000Z')),
    });
    context.stripe.customerRecords.set('cus_alpha', {
      id: 'cus_alpha',
      object: 'customer',
      deleted: false,
      invoice_settings: { default_payment_method: 'pm_alpha' },
    } as unknown as Stripe.Customer);

    await context.service.setCollectionMethod(
      'president-1',
      'automatic',
      'https://app.example.com/settings/club-billing',
    );

    assert.equal(context.stripe.subscriptionRequests.length, 1);
    assert.equal(context.stripe.subscriptionRequests[0]!.trial_period_days, undefined);
    assert.equal(context.firestore.read('clubs/alpha')!.trialEndsAt, null);
  });

  it('rejects invoice billing until the club has completed its first activation', async () => {
    const context = setup(new Date('2026-08-17T16:00:00.000Z'));
    context.firestore.seed('users/president-1', {
      email: 'president@example.com',
      role: 3,
      clubId: 'alpha',
    });
    context.firestore.seed(
      'clubs/alpha',
      club({ accessState: 'pending_setup', collectionMethod: 'manual' }),
    );
    context.firestore.seed('billing-accounts/alpha', {
      customerId: 'cus_alpha',
      collectionMethod: 'manual',
    });

    await assert.rejects(
      context.service.setCollectionMethod(
        'president-1',
        'manual',
        'https://app.example.com/settings/club-billing',
      ),
      /Start the free trial with automatic payments/,
    );
    assert.equal(context.stripe.subscriptionRequests.length, 0);
  });

  it('does not allow invoice billing until the automatic trial has ended', async () => {
    const context = setup(new Date('2026-09-01T16:00:00.000Z'));
    context.firestore.seed('users/president-1', {
      email: 'president@example.com',
      role: 3,
      clubId: 'alpha',
    });
    context.firestore.seed(
      'clubs/alpha',
      club({
        collectionMethod: 'automatic',
        trialEndsAt: Timestamp.fromDate(new Date('2026-09-16T16:00:00.000Z')),
      }),
    );
    context.firestore.seed('billing-accounts/alpha', {
      customerId: 'cus_alpha',
      subscriptionId: 'sub_alpha',
      collectionMethod: 'automatic',
    });

    await assert.rejects(
      context.service.setCollectionMethod(
        'president-1',
        'manual',
        'https://app.example.com/settings/club-billing',
      ),
      /after the free trial ends/,
    );
  });

  it('does not let stale pending manual setup activate a first subscription', async () => {
    const context = setup(new Date('2026-08-17T16:00:00.000Z'));
    context.firestore.seed(
      'clubs/alpha',
      club({ accessState: 'pending_setup', collectionMethod: 'manual' }),
    );
    context.firestore.seed('billing-accounts/alpha', {
      customerId: 'cus_alpha',
      collectionMethod: 'manual',
      pendingCollectionMethod: 'manual',
    });
    const customer = {
      id: 'cus_alpha',
      object: 'customer',
      deleted: false,
      name: 'Alpha Cats',
      email: 'billing@example.com',
      address: {
        line1: '1 College Way',
        city: 'Atlanta',
        postal_code: '30332',
        country: 'US',
      },
    } as unknown as Stripe.Customer;

    await context.service.handleWebhook(
      event('evt_stale_manual', 'customer.updated', customer),
    );

    assert.equal(context.stripe.subscriptionRequests.length, 0);
    assert.equal(
      context.firestore.read('billing-accounts/alpha')!.pendingCollectionMethod,
      null,
    );
  });

  it('sends the trial-ending reminder once through the webhook ledger', async () => {
    const context = setup(new Date('2026-09-13T16:00:00.000Z'));
    const trialEndsAt = Date.parse('2026-09-16T16:00:00.000Z') / 1_000;
    context.firestore.seed(
      'clubs/alpha',
      club({ trialEndsAt: Timestamp.fromMillis(trialEndsAt * 1_000) }),
    );
    context.firestore.seed('billing-accounts/alpha', {
      customerId: 'cus_alpha',
      subscriptionId: 'sub_alpha',
      collectionMethod: 'automatic',
    });
    const trial = {
      id: 'sub_alpha',
      object: 'subscription',
      status: 'trialing',
      trial_end: trialEndsAt,
      metadata: { clubId: 'alpha' },
    } as unknown as Stripe.Subscription;
    const reminder = event(
      'evt_trial_reminder',
      'customer.subscription.trial_will_end',
      trial,
    );

    await context.service.handleWebhook(reminder);
    await context.service.handleWebhook(reminder);

    assert.deepEqual(context.notifications, ['Campus Cats free trial ends soon']);
    assert.equal(
      context.firestore.read('stripe-events/evt_trial_reminder')!.status,
      'processed',
    );
  });

  it('ignores the zero-dollar invoice Stripe creates when the trial starts', async () => {
    const context = setup(new Date('2026-08-17T16:00:00.000Z'));
    const startupInvoice = invoice({
      id: 'in_trial_start',
      status: 'draft',
      amount_due: 0,
      amount_remaining: 0,
      billing_reason: 'subscription_create',
    });

    await context.service.handleWebhook(
      event('evt_trial_invoice', 'invoice.created', startupInvoice),
    );

    assert.deepEqual(context.stripe.updatedInvoices, []);
    assert.equal(
      context.firestore.read(
        `${billingCollectionNames.invoiceReconciliations}/in_trial_start`,
      ),
      undefined,
    );
  });

  it('keeps billing state changes but suppresses email when the environment gate is disabled', async () => {
    const context = setup(new Date('2026-08-01T04:05:00.000Z'), false);
    context.firestore.seed('users/president-1', {
      email: 'president@example.com',
      role: 3,
      clubId: 'alpha',
    });
    context.firestore.seed('clubs/alpha', club());

    await context.service.updateBillingEmail(
      'president-1',
      'new-billing@example.com',
    );

    assert.equal(
      context.firestore.read('clubs/alpha')!.billingEmail,
      'new-billing@example.com',
    );
    assert.deepEqual(context.notifications, []);
  });

  it('moves an unpaid invoice through due, lapsed, and suspended states in club time', async () => {
    const context = setup(new Date('2026-08-01T04:05:00.000Z'));
    context.firestore.seed('clubs/alpha', club());
    context.firestore.seed('billing-accounts/alpha', {
      customerId: 'cus_alpha',
      subscriptionId: 'sub_alpha',
      collectionMethod: 'manual',
    });
    const august = invoice();
    context.stripe.invoiceRecords.set(august.id, august);

    await context.service.handleWebhook(
      event('evt_failed', 'invoice.payment_failed', august),
    );
    const due = context.firestore.read('clubs/alpha')!.invoiceDueAt as Timestamp;
    const grace = context.firestore.read('clubs/alpha')!.graceEndsAt as Timestamp;
    assert.equal(due.toDate().toISOString(), '2026-08-02T03:59:59.999Z');
    assert.equal(grace.toDate().toISOString(), '2026-09-01T04:00:00.000Z');
    assert.equal(context.firestore.read('clubs/alpha')!.paymentStanding, 'current');

    context.clock.now = new Date(due.toMillis() + 1);
    await context.service.enforceDeadlines();
    assert.equal(context.firestore.read('clubs/alpha')!.paymentStanding, 'past_due');
    assert.equal(context.firestore.read('clubs/alpha')!.accessState, 'enabled');

    context.clock.now = grace.toDate();
    await context.service.enforceDeadlines();
    assert.equal(context.firestore.read('clubs/alpha')!.accessState, 'suspended');
    assert.equal(context.firestore.read('clubs/alpha')!.suspensionReason, 'nonpayment');
    assert.deepEqual(context.stripe.cancelledSubscriptions, ['sub_alpha']);
    assert.deepEqual(context.notifications, [
      'Campus Cats payment failed',
      'Campus Cats payment is overdue',
      'Campus Cats access suspended',
    ]);
  });

  it('keeps cancellation closed after final payment but restores nonpayment with a fresh subscription', async () => {
    const cancellation = setup(new Date('2026-09-02T12:00:00.000Z'));
    cancellation.firestore.seed(
      'clubs/alpha',
      club({
        accessState: 'suspended',
        paymentStanding: 'past_due',
        suspensionReason: 'cancellation',
      }),
    );
    cancellation.firestore.seed('billing-accounts/alpha', {
      customerId: 'cus_alpha',
      outstandingInvoiceId: 'in_august',
      collectionMethod: 'manual',
      suspensionReason: 'cancellation',
    });
    const paid = invoice({ status: 'paid', amount_remaining: 0, amount_paid: 1_250 });
    cancellation.stripe.invoiceRecords.set(paid.id, paid);
    await cancellation.service.handleWebhook(event('evt_paid_final', 'invoice.paid', paid));
    assert.equal(cancellation.firestore.read('clubs/alpha')!.accessState, 'suspended');
    assert.equal(
      cancellation.firestore.read('clubs/alpha')!.suspensionReason,
      'cancellation',
    );
    assert.equal(cancellation.stripe.createdSubscriptions.length, 0);

    const nonpayment = setup(new Date('2026-09-02T12:00:00.000Z'));
    nonpayment.firestore.seed(
      'clubs/alpha',
      club({
        accessState: 'suspended',
        paymentStanding: 'past_due',
        suspensionReason: 'nonpayment',
      }),
    );
    nonpayment.firestore.seed('billing-accounts/alpha', {
      customerId: 'cus_alpha',
      outstandingInvoiceId: 'in_august',
      collectionMethod: 'manual',
      suspensionReason: 'nonpayment',
    });
    nonpayment.stripe.invoiceRecords.set(paid.id, paid);
    await nonpayment.service.handleWebhook(event('evt_paid_restore', 'invoice.paid', paid));
    assert.equal(nonpayment.firestore.read('clubs/alpha')!.accessState, 'enabled');
    assert.equal(nonpayment.firestore.read('clubs/alpha')!.paymentStanding, 'current');
    assert.equal(nonpayment.stripe.createdSubscriptions.length, 1);
    assert.equal(
      nonpayment.firestore.read('billing-accounts/alpha')!.subscriptionId,
      'sub_created_1',
    );
  });

  it('ignores stale and duplicate paid webhooks while a newer invoice remains open', async () => {
    const context = setup(new Date('2026-09-02T12:00:00.000Z'));
    context.firestore.seed(
      'clubs/alpha',
      club({ paymentStanding: 'past_due' }),
    );
    context.firestore.seed('billing-accounts/alpha', {
      customerId: 'cus_alpha',
      outstandingInvoiceId: 'in_september',
      collectionMethod: 'manual',
    });
    const older = invoice({ status: 'paid', amount_remaining: 0, amount_paid: 1_250 });
    const newer = invoice({
      id: 'in_september',
      created: Date.parse('2026-09-01T04:00:00.000Z') / 1_000,
    });
    context.stripe.invoiceRecords.set(older.id, older);
    context.stripe.invoiceRecords.set(newer.id, newer);
    const paidEvent = event('evt_old_paid', 'invoice.paid', older);

    await context.service.handleWebhook(paidEvent);
    const retrievals = context.stripe.invoiceRetrievals;
    await context.service.handleWebhook(paidEvent);

    assert.equal(context.firestore.read('clubs/alpha')!.paymentStanding, 'past_due');
    assert.equal(
      context.firestore.read('billing-accounts/alpha')!.outstandingInvoiceId,
      'in_september',
    );
    assert.equal(context.stripe.invoiceRetrievals, retrievals);
    assert.equal(
      context.firestore.read('stripe-events/evt_old_paid')!.status,
      'processed',
    );
  });

  it('deduplicates usage, retries deterministic meter delivery, and reconciles before finalizing', async () => {
    const context = setup(new Date('2026-08-15T12:00:00.000Z'));
    context.firestore.seed('clubs/alpha', club());
    context.firestore.seed('billing-accounts/alpha', {
      customerId: 'cus_alpha',
      subscriptionId: 'sub_alpha',
      collectionMethod: 'automatic',
    });

    const activity = {
      eventId: 'firestore-event-1',
      clubId: 'alpha',
      collection: 'cat-sightings',
      operation: 'create' as const,
      occurredAt: context.clock.now,
      initiatedBy: 'user' as const,
      actorId: 'member-1',
    };
    await context.service.recordActivity(activity);
    await context.service.recordActivity(activity);
    assert.equal(
      context.firestore.read('clubs/alpha/billing-usage/2026-08')!.activityUnits,
      1,
    );

    context.stripe.meterFailures = 1;
    assert.equal(await context.service.dispatchPendingUsage(), 0);
    assert.equal(
      context.firestore.read('billing-usage-events/firestore-firestore-event-1')!
        .attempts,
      1,
    );
    assert.equal(await context.service.dispatchPendingUsage(), 1);
    assert.deepEqual(context.stripe.meterDeliveries, [
      { identifier: 'firestore-firestore-event-1', value: '1' },
    ]);

    const draft = invoice({ id: 'in_reconcile', status: 'draft', amount_remaining: 0 });
    context.stripe.invoiceRecords.set(draft.id, draft);
    context.firestore.seed(
      `${billingCollectionNames.invoiceReconciliations}/${draft.id}`,
      {
        clubId: 'alpha',
        periodKey: '2026-08',
        status: 'pending',
        readyAfter: Timestamp.fromDate(new Date('2026-08-15T11:59:00.000Z')),
      },
    );
    assert.equal(await context.service.reconcilePendingInvoices(), 1);
    assert.deepEqual(context.stripe.finalizedInvoices, ['in_reconcile']);
    assert.equal(
      context.firestore.read(
        `${billingCollectionNames.invoiceReconciliations}/in_reconcile`,
      )!.status,
      'complete',
    );
  });
});
