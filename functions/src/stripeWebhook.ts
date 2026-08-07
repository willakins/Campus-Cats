import Stripe from 'stripe';

export interface StripeWebhookVerifier {
  constructEvent(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): Stripe.Event;
}

export const handleSignedStripeWebhook = async (
  input: {
    readonly payload: string | Buffer;
    readonly signature: string;
    readonly secret: string;
  },
  verifier: StripeWebhookVerifier,
  handle: (event: Stripe.Event) => Promise<void>,
): Promise<void> => {
  const event = verifier.constructEvent(
    input.payload,
    input.signature,
    input.secret,
  );
  await handle(event);
};
