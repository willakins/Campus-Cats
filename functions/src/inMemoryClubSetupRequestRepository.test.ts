import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HandlerError } from './handlers';
import { InMemoryClubSetupRequestRepository } from './inMemoryClubSetupRequestRepository';
import { ClubSetupRequestRecord } from './universityOnboarding';

const record = (
  id: string,
  universityId: string,
  now: Date,
  overrides: Partial<ClubSetupRequestRecord> = {},
): ClubSetupRequestRecord => ({
  id,
  universityId,
  universityName: `University ${universityId}`,
  clubName: `Club ${universityId}`,
  timezone: 'America/New_York',
  presidentEmail: `president-${id}@example.edu`,
  primaryColor: '#112233',
  accentColor: '#AABBCC',
  tokenHash: `token-${id}`,
  clientIpHash: `ip-${id}`,
  emailHash: `email-${id}`,
  expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
  ...overrides,
});

const isHandlerError = (code: string, message?: string) =>
  (error: unknown): boolean =>
    error instanceof HandlerError &&
    error.code === code &&
    (message === undefined || error.message === message);

describe('in-memory club setup request repository contract', () => {
  it('allows only one concurrent claim and returns a generic duplicate response', async () => {
    const now = new Date('2026-08-07T12:00:00.000Z');
    const repository = new InMemoryClubSetupRequestRepository(() => now);
    const duplicateMessage =
      'Club setup is already in progress or complete for this university';
    const results = await Promise.allSettled([
      repository.begin(record('first', '100', now)),
      repository.begin(record('second', '100', now)),
    ]);

    assert.equal(results.filter(({ status }) => status === 'fulfilled').length, 1);
    const rejected = results.find(({ status }) => status === 'rejected');
    assert(rejected?.status === 'rejected');
    assert(isHandlerError('already-exists', duplicateMessage)(rejected.reason));

    const mapped = new InMemoryClubSetupRequestRepository(() => now);
    mapped.seedMappedUniversity('100');
    await assert.rejects(
      () => mapped.begin(record('mapped', '100', now)),
      isHandlerError('already-exists', duplicateMessage),
    );
  });

  it('releases failed email claims and expired claims for a later request', async () => {
    let now = new Date('2026-08-07T12:00:00.000Z');
    const repository = new InMemoryClubSetupRequestRepository(() => now);
    await repository.begin(record('failed-email', '101', now));
    await repository.cancel('failed-email');
    await repository.begin(record('replacement', '101', now));
    assert.equal(repository.claimOwner('101'), 'replacement');

    await repository.begin(record('expiring', '102', now, {
      expiresAt: new Date(now.getTime() + 1000),
    }));
    now = new Date(now.getTime() + 1001);
    await repository.begin(record('after-expiry', '102', now));
    assert.equal(repository.claimOwner('102'), 'after-expiry');
  });

  it('enforces IP and email request throttles', async () => {
    const now = new Date('2026-08-07T12:00:00.000Z');
    const ipRepository = new InMemoryClubSetupRequestRepository(() => now);
    for (let index = 0; index < 5; index += 1) {
      await ipRepository.begin(record(`ip-${index}`, String(200 + index), now, {
        clientIpHash: 'same-ip',
      }));
    }
    await assert.rejects(
      () => ipRepository.begin(record('ip-blocked', '299', now, {
        clientIpHash: 'same-ip',
      })),
      isHandlerError('failed-precondition'),
    );

    const emailRepository = new InMemoryClubSetupRequestRepository(() => now);
    for (let index = 0; index < 3; index += 1) {
      await emailRepository.begin(record(`email-${index}`, String(300 + index), now, {
        emailHash: 'same-email',
      }));
    }
    await assert.rejects(
      () => emailRepository.begin(record('email-blocked', '399', now, {
        emailHash: 'same-email',
      })),
      isHandlerError('failed-precondition'),
    );
  });

  it('hash-checks, expires, leases, retries, and completes verification', async () => {
    let now = new Date('2026-08-07T12:00:00.000Z');
    const repository = new InMemoryClubSetupRequestRepository(() => now);
    const request = record('verify', '400', now);
    await repository.begin(request);
    await assert.rejects(
      () => repository.loadForVerification('verify', 'wrong-hash'),
      isHandlerError('permission-denied'),
    );

    const loaded = await repository.loadForVerification('verify', request.tokenHash);
    assert.equal(loaded.id, 'verify');
    assert.equal(repository.status('verify'), 'provisioning');
    await assert.rejects(
      () => repository.begin(record('takeover', '400', now)),
      isHandlerError('already-exists'),
    );

    await repository.fail('verify');
    assert.equal(repository.status('verify'), 'pending');
    await repository.loadForVerification('verify', request.tokenHash);
    await repository.complete('verify', 'club-400');
    assert.equal(repository.status('verify'), 'completed');
    await assert.rejects(
      () => repository.loadForVerification('verify', request.tokenHash),
      isHandlerError('failed-precondition'),
    );
    await repository.fail('verify');
    assert.equal(repository.status('verify'), 'completed');

    now = new Date(request.expiresAt.getTime() + 1);
    await assert.rejects(
      () => repository.loadForVerification('verify', request.tokenHash),
      isHandlerError('failed-precondition'),
    );
  });
});
