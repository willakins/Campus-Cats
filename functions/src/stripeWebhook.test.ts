import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import Stripe from 'stripe';

import { handleSignedStripeWebhook } from './stripeWebhook';

const secret = 'whsec_test_secret';
const payload = JSON.stringify({
  id: 'evt_test_signed',
  object: 'event',
  api_version: '2026-07-29.basil',
  created: 1_786_000_000,
  data: { object: { id: 'in_test', object: 'invoice' } },
  livemode: false,
  pending_webhooks: 1,
  request: null,
  type: 'invoice.paid',
});

describe('Stripe webhook signature boundary', () => {
  it('passes an authentic event to the idempotent workflow', async () => {
    const stripe = new Stripe('sk_test_not_used');
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });
    let eventId: string | undefined;
    await handleSignedStripeWebhook(
      { payload, signature, secret },
      stripe.webhooks,
      async (event) => {
        eventId = event.id;
      },
    );
    assert.equal(eventId, 'evt_test_signed');
  });

  it('rejects a tampered signature before invoking billing behavior', async () => {
    const stripe = new Stripe('sk_test_not_used');
    let invoked = false;
    await assert.rejects(() =>
      handleSignedStripeWebhook(
        { payload, signature: 't=1,v1=invalid', secret },
        stripe.webhooks,
        async () => {
          invoked = true;
        },
      ),
    );
    assert.equal(invoked, false);
  });
});
