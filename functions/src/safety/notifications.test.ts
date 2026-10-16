import test from 'node:test';
import assert from 'node:assert/strict';
import sgMail from '@sendgrid/mail';

test('safety notifications omit report contents, retry failures, and skip completed or deleted cases', async (context) => {
  const { notifySafetyReport } = await import('./callables');
  const previousKey = process.env.SENDGRID_API_KEY;
  process.env.SENDGRID_API_KEY = 'test-secret-never-sent';
  context.after(() => {
    if (previousKey === undefined) delete process.env.SENDGRID_API_KEY;
    else process.env.SENDGRID_API_KEY = previousKey;
  });
  context.mock.method(sgMail, 'setApiKey', () => undefined);
  let fail = true;
  let exists = true;
  let notificationState = 'pending';
  const deliveries: unknown[] = [];
  context.mock.method(sgMail, 'send', async (message: unknown) => {
    deliveries.push(message);
    if (fail)
      throw new Error('Provider error containing private request details');
    return [];
  });
  const event = {
    data: {
      id: 'safe-reference',
      ref: {
        get: async () => ({
          exists,
          data: () => ({
            notificationState,
            description: 'PRIVATE_REPORT_BODY',
            contentReference: 'PRIVATE_CONTENT_REFERENCE',
            reporterEmail: 'reporter-private@example.test',
          }),
        }),
        update: async (change: { notificationState: string }) => {
          notificationState = change.notificationState;
        },
      },
    },
  } as unknown as Parameters<typeof notifySafetyReport.run>[0];
  await assert.rejects(notifySafetyReport.run(event), {
    message: 'Safety report notification delivery failed; retry required',
  });
  assert.equal(notificationState, 'pending');
  fail = false;
  await notifySafetyReport.run(event);
  assert.equal(notificationState, 'sent');
  const payload = JSON.stringify(deliveries);
  assert.ok(payload.includes('safe-reference'));
  assert.ok(payload.includes('/safety/inbox'));
  assert.ok(!payload.includes('PRIVATE_REPORT_BODY'));
  assert.ok(!payload.includes('PRIVATE_CONTENT_REFERENCE'));
  assert.ok(!payload.includes('reporter-private@example.test'));
  await notifySafetyReport.run(event);
  assert.equal(deliveries.length, 2);
  exists = false;
  notificationState = 'pending';
  await notifySafetyReport.run(event);
  assert.equal(deliveries.length, 2);
});
