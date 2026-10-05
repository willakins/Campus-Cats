import {
  initializeApp,
  deleteApp,
} from '../../functions/node_modules/firebase-admin/lib/app/index';
import { getFirestore } from '../../functions/node_modules/firebase-admin/lib/firestore/index';
import { CustomerBillingService } from '../../functions/src/billing/customerBilling';
import * as handlers from '../../functions/src/billing/customerBillingHandlers';
import {
  assertDemoProjectId,
  FIREBASE_TEST_PROJECT_ID,
} from '../support/firebaseProject';

type StripeClient = ConstructorParameters<
  typeof CustomerBillingService
>[0]['stripe'];
type StripeEvent = Parameters<CustomerBillingService['handleWebhook']>[0];

describe('Stripe billing isolation with real membership records', () => {
  const app = initializeApp(
    { projectId: assertDemoProjectId(FIREBASE_TEST_PROJECT_ID) },
    'billing-isolation',
  );
  const db = getFirestore(app);
  const calls: { operation: string; args: unknown[] }[] = [];
  const customers = new Map<string, Record<string, unknown>>();
  const invoices = new Map<string, Record<string, unknown>>();
  const subscriptions = new Map<string, Record<string, unknown>>();
  const record = <A extends unknown[], T>(
    operation: string,
    fn: (...args: A) => T,
  ) =>
    jest.fn((...args: A) => {
      calls.push({ operation, args });
      return Promise.resolve(fn(...args));
    });
  const stripe = {
    customers: {
      retrieve: record('customers.retrieve', (id: string) => customers.get(id)),
      update: record('customers.update', (id: string, update: object) => ({
        ...customers.get(id),
        ...update,
      })),
      create: record('customers.create', () => {
        throw new Error('Unexpected customer creation');
      }),
    },
    invoices: {
      list: record(
        'invoices.list',
        ({ customer, status }: { customer: string; status?: string }) => ({
          data: [...invoices.values()].filter(
            (invoice) =>
              invoice.customer === customer &&
              (!status || invoice.status === status),
          ),
        }),
      ),
      retrieve: record('invoices.retrieve', (id: string) => invoices.get(id)),
      update: record('invoices.update', (id: string) => invoices.get(id)),
    },
    subscriptions: {
      retrieve: record('subscriptions.retrieve', (id: string) =>
        subscriptions.get(id),
      ),
      update: record('subscriptions.update', (id: string, update: object) => ({
        ...subscriptions.get(id),
        ...update,
      })),
      list: record(
        'subscriptions.list',
        ({ customer }: { customer: string }) => ({
          data: [...subscriptions.values()].filter(
            (s) => s.customer === customer,
          ),
        }),
      ),
    },
    paymentMethods: {
      retrieve: record('paymentMethods.retrieve', (id: string) => ({
        id,
        customer: id === 'pm_alpha' ? 'cus_alpha' : 'cus_beta',
        type: 'card',
        card: { brand: 'visa', last4: id === 'pm_alpha' ? '4242' : '9999' },
        billing_details: { name: 'Private payer name' },
      })),
    },
    billingPortal: {
      sessions: {
        create: record(
          'portal.create',
          ({ customer }: { customer: string }) => ({
            url: `https://billing.stripe.com/p/session_${customer}`,
          }),
        ),
      },
    },
    checkout: {
      sessions: {
        create: record(
          'checkout.create',
          ({ customer }: { customer: string }) => ({
            url: `https://checkout.stripe.com/c/pay/session_${customer}`,
          }),
        ),
      },
    },
    setupIntents: {
      retrieve: record('setupIntents.retrieve', () => ({
        id: 'seti_alpha',
        customer: 'cus_alpha',
        payment_method: 'pm_alpha',
        status: 'succeeded',
      })),
    },
    prices: {
      list: record(
        'prices.list',
        ({ lookup_keys }: { lookup_keys: string[] }) => ({
          data: [
            {
              id: `price_${lookup_keys[0]}`,
              lookup_key: lookup_keys[0],
              currency: 'usd',
              unit_amount: 1,
              recurring: {
                interval: 'month',
                usage_type: 'metered',
                meter: `meter_${lookup_keys[0]}`,
              },
              transform_quantity:
                lookup_keys[0] === 'media'
                  ? { divide_by: 1_000_000, round: 'up' }
                  : null,
            },
          ],
        }),
      ),
    },
    billing: {
      meters: {
        retrieve: record('meters.retrieve', (id: string) => ({
          id,
          event_name: id === 'meter_media' ? 'media_bytes' : 'activity_units',
          default_aggregation: { formula: 'sum' },
        })),
      },
    },
  };
  const service = new CustomerBillingService({
    firestore: db,
    stripe: stripe as unknown as StripeClient,
    config: {
      activityPriceLookupKey: 'activity',
      mediaPriceLookupKey: 'media',
      activityMeterEventName: 'activity_units',
      mediaMeterEventName: 'media_bytes',
      automaticTax: true,
      webAppOrigin: 'https://app.example.test',
      billingEmailsEnabled: false,
    },
    notify: async () => undefined,
  });
  const operations = [
    handlers.handleGetClubBillingSummary,
    handlers.handleCreateClubBillingSetupSession,
    handlers.handleCreateClubBillingPortalSession,
    handlers.handlePayClubOutstandingInvoice,
    handlers.handleSetClubCollectionMethod,
    handlers.handleUpdateClubBillingEmail,
    handlers.handleScheduleClubCancellation,
    handlers.handleResumeClubSubscription,
  ];
  const request = (
    authUid: string | undefined = 'billing-president-alpha',
  ) => ({
    authUid,
    data: {
      // All these identity selectors are attacker input and must have no effect.
      clubId: 'billing-beta',
      customerId: 'cus_beta',
      invoiceId: 'in_beta',
      subscriptionId: 'sub_beta',
      paymentMethodId: 'pm_beta',
      userId: 'billing-president-beta',
      authUid: 'billing-president-beta',
      role: 4,
      returnUrl: 'https://app.example.test/settings/club-billing',
      method: 'manual',
      email: 'new-billing@alpha.example.test',
    },
  });
  beforeEach(async () => {
    calls.length = 0;
    customers.clear();
    invoices.clear();
    subscriptions.clear();
    await db.doc('stripe-events/evt_billing_cross_customer').delete();
    for (const name of ['alpha', 'beta']) {
      await db.doc(`users/billing-president-${name}`).set({
        email: `${name}@example.test`,
        role: 3,
        clubId: `billing-${name}`,
        banned: false,
      });
      await db.doc(`clubs/billing-${name}`).set({
        name,
        timezone: 'UTC',
        billingEmail: `${name}@example.test`,
        accessState: 'enabled',
        billingEnforcementEnabled: true,
        collectionMethod: 'automatic',
        paymentStanding: 'current',
        maintenanceMode: false,
      });
      await db.doc(`billing-accounts/billing-${name}`).set({
        customerId: `cus_${name}`,
        subscriptionId: `sub_${name}`,
        outstandingInvoiceId: `in_${name}`,
        collectionMethod: 'automatic',
      });
      customers.set(`cus_${name}`, {
        id: `cus_${name}`,
        metadata: { clubId: `billing-${name}` },
        invoice_settings: { default_payment_method: `pm_${name}` },
      });
      invoices.set(`in_${name}`, {
        id: `in_${name}`,
        customer: `cus_${name}`,
        status: 'open',
        amount_remaining: 1200,
        amount_due: 1200,
        amount_paid: 0,
        currency: 'usd',
        created: 1_790_000_000,
        hosted_invoice_url: `https://invoice.stripe.com/i/in_${name}`,
        parent: {
          subscription_details: {
            subscription: `sub_${name}`,
            metadata: { clubId: `billing-${name}` },
          },
        },
      });
      subscriptions.set(`sub_${name}`, {
        id: `sub_${name}`,
        customer: `cus_${name}`,
        metadata: { clubId: `billing-${name}` },
        status: 'active',
        items: { data: [{ current_period_end: 1_800_000_000 }] },
      });
    }
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await deleteApp(app);
  });

  it.each([0, 1, 2])(
    'blocks every billing operation for role %s before contacting Stripe',
    async (role) => {
      await db.doc('users/billing-president-alpha').update({ role });
      for (const operation of operations)
        await expect(operation(request(), service)).rejects.toMatchObject({
          code: 'permission-denied',
        });
      expect(calls).toHaveLength(0);
    },
  );
  it.each(['banned', 'deletionPending'])(
    'blocks every billing operation for a %s account',
    async (field) => {
      await db.doc('users/billing-president-alpha').update({ [field]: true });
      for (const operation of operations)
        await expect(operation(request(), service)).rejects.toMatchObject({
          code: 'permission-denied',
        });
      expect(calls).toHaveLength(0);
    },
  );
  it('rejects unsigned and missing-member requests', async () => {
    for (const operation of operations) {
      await expect(
        operation({ data: request().data }, service),
      ).rejects.toMatchObject({ code: 'unauthenticated' });
      await expect(
        operation(request('missing-billing-member'), service),
      ).rejects.toMatchObject({ code: 'permission-denied' });
    }
    expect(calls).toHaveLength(0);
  });
  it.each(operations.map((operation) => [operation.name, operation] as const))(
    'ignores foreign identifiers in %s',
    async (_name, operation) => {
      await operation(request(), service);
      expect(JSON.stringify(calls)).not.toMatch(
        /cus_beta|sub_beta|in_beta|pm_beta|billing-beta/,
      );
      expect(
        (await db.doc('clubs/billing-beta').get()).data()?.billingEmail,
      ).toBe('beta@example.test');
    },
  );
  it('returns only the selected club invoice fields and masked card label', async () => {
    const summary = await service.getSummary('billing-president-alpha');
    expect(summary.clubId).toBe('billing-alpha');
    expect(summary.invoices.map(({ id }) => id)).toEqual(['in_alpha']);
    expect(summary.paymentMethodLabel).toBe('VISA ending in 4242');
    expect(JSON.stringify(summary)).not.toMatch(
      /9999|in_beta|cus_beta|Private payer name|client_secret|billing_details/,
    );
  });
  it('rejects a misassociated Stripe customer before creating a portal session', async () => {
    await db
      .doc('billing-accounts/billing-alpha')
      .update({ customerId: 'cus_beta' });
    await expect(
      service.createPortalSession(
        'billing-president-alpha',
        request().data.returnUrl,
      ),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(calls.some(({ operation }) => operation === 'portal.create')).toBe(
      false,
    );
  });
  it('rejects an outstanding invoice belonging to another customer', async () => {
    await db
      .doc('billing-accounts/billing-alpha')
      .update({ outstandingInvoiceId: 'in_beta' });
    await expect(
      service.payOutstandingInvoice('billing-president-alpha'),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });
  it('rejects a subscription belonging to another customer before changing it', async () => {
    await db
      .doc('billing-accounts/billing-alpha')
      .update({ subscriptionId: 'sub_beta' });
    await expect(
      service.scheduleCancellation('billing-president-alpha'),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(
      calls.some(({ operation }) => operation === 'subscriptions.update'),
    ).toBe(false);
  });
  it('rejects a payment-method record belonging to another customer', async () => {
    customers.get('cus_alpha')!.invoice_settings = {
      default_payment_method: 'pm_beta',
    };
    await expect(
      service.getSummary('billing-president-alpha'),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });
  it('does not return an invoice link after the President is demoted during the Stripe lookup', async () => {
    jest.spyOn(stripe.invoices, 'retrieve').mockImplementationOnce(async () => {
      await db.doc('users/billing-president-alpha').update({ role: 0 });
      return invoices.get('in_alpha');
    });
    await expect(
      service.payOutstandingInvoice('billing-president-alpha'),
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('does not let Checkout metadata rebind another club to a different customer', async () => {
    await expect(
      service.handleWebhook({
        id: 'evt_billing_cross_customer',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_beta',
            mode: 'setup',
            status: 'complete',
            customer: 'cus_beta',
            setup_intent: 'seti_alpha',
            metadata: {
              clubId: 'billing-alpha',
              purpose: 'activate_or_update_collection',
              collectionMethod: 'automatic',
            },
          },
        },
      } as unknown as StripeEvent),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(
      (await db.doc('billing-accounts/billing-alpha').get()).data()?.customerId,
    ).toBe('cus_alpha');
    expect(
      calls.some(
        ({ operation }) =>
          operation === 'customers.update' ||
          operation === 'subscriptions.update',
      ),
    ).toBe(false);
  });

  const checkoutEvent = (id: string) => ({
    id,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_alpha',
        mode: 'setup',
        status: 'complete',
        customer: 'cus_alpha',
        setup_intent: 'seti_alpha',
        metadata: {
          clubId: 'billing-alpha',
          purpose: 'activate_or_update_collection',
          collectionMethod: 'automatic',
        },
      },
    },
  });

  it.each(['mode', 'setup-customer', 'setup-status', 'payment-customer'])(
    'rejects invalid Checkout %s before updating a customer or subscription',
    async (condition) => {
      const event = checkoutEvent(`evt_checkout_${condition}`);
      if (condition === 'mode') event.data.object.mode = 'payment';
      if (condition === 'setup-customer')
        stripe.setupIntents.retrieve.mockResolvedValueOnce({
          id: 'seti_alpha',
          customer: 'cus_beta',
          payment_method: 'pm_beta',
          status: 'succeeded',
        });
      if (condition === 'setup-status')
        stripe.setupIntents.retrieve.mockResolvedValueOnce({
          id: 'seti_alpha',
          customer: 'cus_alpha',
          payment_method: 'pm_alpha',
          status: 'requires_payment_method',
        });
      if (condition === 'payment-customer')
        stripe.paymentMethods.retrieve.mockResolvedValueOnce({
          id: 'pm_alpha',
          customer: 'cus_beta',
          type: 'card',
          card: { brand: 'visa', last4: '9999' },
          billing_details: { name: 'Private payer name' },
        });
      await expect(
        service.handleWebhook(event as unknown as StripeEvent),
      ).rejects.toMatchObject({ code: 'failed-precondition' });
      expect(
        calls.some(
          ({ operation }) =>
            operation === 'customers.update' ||
            operation === 'subscriptions.update',
        ),
      ).toBe(false);
    },
  );

  it('accepts valid Checkout completion without touching another club', async () => {
    await service.handleWebhook(
      checkoutEvent('evt_valid_checkout') as unknown as StripeEvent,
    );
    expect(
      calls.find(({ operation }) => operation === 'customers.update')?.args[0],
    ).toBe('cus_alpha');
    expect(
      calls.find(({ operation }) => operation === 'subscriptions.update')
        ?.args[0],
    ).toBe('sub_alpha');
    expect(
      (await db.doc('billing-accounts/billing-alpha').get()).data()?.customerId,
    ).toBe('cus_alpha');
    expect(JSON.stringify(calls)).not.toMatch(/cus_beta|sub_beta|billing-beta/);
  });

  it('rejects an invoice event whose metadata names a different club than its customer', async () => {
    const invoice = {
      ...invoices.get('in_beta')!,
      parent: {
        subscription_details: { metadata: { clubId: 'billing-alpha' } },
      },
    };
    invoices.set('in_beta', invoice);
    await expect(
      service.handleWebhook({
        id: 'evt_billing_invoice_mismatch',
        type: 'invoice.finalized',
        data: { object: invoice },
      } as unknown as StripeEvent),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(
      (await db.doc('billing-accounts/billing-alpha').get()).data()
        ?.outstandingInvoiceId,
    ).toBe('in_alpha');
  });

  it.each([
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'customer.subscription.trial_will_end',
  ])('rejects a mismatched customer in %s', async (type) => {
    const subscription = {
      ...subscriptions.get('sub_alpha'),
      customer: 'cus_beta',
      trial_end: 1_800_000_000,
    };
    await expect(
      service.handleWebhook({
        id: `evt_${type.replaceAll('.', '_')}`,
        type,
        data: { object: subscription },
      } as unknown as StripeEvent),
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(
      (await db.doc('billing-accounts/billing-alpha').get()).data()
        ?.subscriptionId,
    ).toBe('sub_alpha');
  });

  it.each(['summary', 'portal', 'setup'])(
    'withholds %s after permissions change during the provider round trip',
    async (operation) => {
      const revoke = () =>
        db.doc('users/billing-president-alpha').update({ role: 0 });
      if (operation === 'summary') {
        jest.spyOn(stripe.invoices, 'list').mockImplementationOnce(async () => {
          await revoke();
          return { data: [invoices.get('in_alpha')!] };
        });
      } else {
        const sessions =
          operation === 'portal'
            ? stripe.billingPortal.sessions
            : stripe.checkout.sessions;
        jest.spyOn(sessions, 'create').mockImplementationOnce(async () => {
          await revoke();
          return { url: 'https://billing.stripe.com/private' };
        });
      }
      const result =
        operation === 'summary'
          ? service.getSummary('billing-president-alpha')
          : operation === 'portal'
            ? service.createPortalSession(
                'billing-president-alpha',
                request().data.returnUrl,
              )
            : service.createSetupSession(
                'billing-president-alpha',
                request().data.returnUrl,
              );
      await expect(result).rejects.toMatchObject({ code: 'permission-denied' });
    },
  );
});
