import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HandlerError } from './handlers';
import {
  ClubSetupRequestRecord,
  UniversityOnboardingDependencies,
  handleRequestClubSetup,
  handleVerifyClubSetup,
} from './universityOnboarding';

const university = {
  id: '139658',
  name: 'Emory University',
  city: 'Atlanta',
  state: 'GA',
  emailDomains: ['emory.edu'],
  timezone: 'America/New_York',
  status: 'unclaimed' as const,
};

const buildDependencies = () => {
  const operations: string[] = [];
  let stored: ClubSetupRequestRecord | undefined;
  const dependencies: UniversityOnboardingDependencies = {
    catalog: {
      search: async () => [university],
      get: async () => university,
    },
    requests: {
      begin: async (request) => {
        stored = request;
        operations.push(`begin:${request.universityId}`);
      },
      cancel: async (requestId) => { operations.push(`cancel:${requestId}`); },
      loadForVerification: async (_requestId, tokenHash) => {
        assert.equal(tokenHash, 'digest');
        if (!stored) throw new Error('Missing request');
        return stored;
      },
      complete: async (requestId, clubId) => { operations.push(`complete:${requestId}:${clubId}`); },
      fail: async (requestId) => { operations.push(`fail:${requestId}`); },
    },
    provision: async () => ({
      clubId: 'club-139658',
      clubName: 'Emory Campus Cats',
      presidentUserId: 'president-1',
    }),
    sendVerification: async (email) => { operations.push(`verify-email:${email}`); },
    newId: () => 'request-1',
    newToken: () => 'secret-token',
    hash: () => 'digest',
    now: () => new Date('2026-08-07T12:00:00.000Z'),
  };
  return { dependencies, operations, get stored() { return stored; } };
};

describe('university onboarding handlers', () => {
  it('requires the selected Scorecard school and its approved email domain', async () => {
    const { dependencies } = buildDependencies();
    await assert.rejects(
      () => handleRequestClubSetup({
        clientIp: '203.0.113.1',
        data: {
          universityId: '139658',
          clubName: 'Emory Campus Cats',
          primaryColor: '#012169',
          accentColor: '#F2A900',
          presidentEmail: 'president@example.com',
        },
      }, dependencies),
      (error: unknown) => error instanceof HandlerError && error.code === 'invalid-argument',
    );
  });

  it('stores only a token hash and sends the one-time verification link', async () => {
    const context = buildDependencies();
    const receipt = await handleRequestClubSetup({
      clientIp: '203.0.113.1',
      data: {
        universityId: '139658',
        clubName: 'Emory Campus Cats',
        primaryColor: '#012169',
        accentColor: '#F2A900',
        presidentEmail: 'president@emory.edu',
      },
    }, context.dependencies);

    assert.equal(context.stored?.tokenHash, 'digest');
    assert(!JSON.stringify(context.stored).includes('secret-token'));
    assert.equal(receipt.maskedEmail, 'p***@emory.edu');
    assert.deepEqual(context.operations, [
      'begin:139658',
      'verify-email:president@emory.edu',
    ]);
  });

  it('provisions verification idempotently through the repository seam', async () => {
    const context = buildDependencies();
    await handleRequestClubSetup({
      clientIp: '203.0.113.1',
      data: {
        universityId: '139658',
        clubName: 'Emory Campus Cats',
        primaryColor: '#012169',
        accentColor: '#F2A900',
        presidentEmail: 'president@emory.edu',
      },
    }, context.dependencies);
    context.dependencies.catalog.get = async () => ({
      ...university,
      status: 'mapped',
      club: { id: 'club-139658', name: 'Emory Campus Cats', emailEnabled: true },
    });

    const result = await handleVerifyClubSetup(
      { data: { requestId: 'request-1', token: 'secret-token' } },
      context.dependencies,
    );
    assert.equal(result.university.club?.id, 'club-139658');
    assert.equal(result.passwordSetupSent, true);
    assert(context.operations.includes('complete:request-1:club-139658'));
  });
});
