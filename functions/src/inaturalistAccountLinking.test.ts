import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HandlerError, ManagedUser } from './handlers';
import {
  InaturalistAccountLinkingDependencies,
  InaturalistLinkAttempt,
  InaturalistLinkIdentity,
  handleBeginInaturalistAccountLink,
  handleGetInaturalistAccountLinkStatus,
  handleInaturalistAccountCallback,
  handleUnlinkInaturalistAccount,
} from './inaturalistAccountLinking';

const now = new Date('2026-08-06T16:00:00.000Z');
const member: ManagedUser = {
  id: 'member-1',
  email: 'member@gatech.edu',
  role: 0,
};

function buildDependencies() {
  const attempts = new Map<string, InaturalistLinkAttempt>();
  const links = new Map<string, InaturalistLinkIdentity>();
  const operations: string[] = [];
  const randomValues = [Buffer.alloc(32, 1), Buffer.alloc(32, 2), Buffer.alloc(32, 3)];
  const value: InaturalistAccountLinkingDependencies = {
    config: {
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'https://cats.example/oauth/inaturalist/callback',
      appReturnUri: 'campuscats://settings/inaturalist-account',
    },
    now: () => now,
    randomBytes: () => randomValues.shift() ?? Buffer.alloc(32, 9),
    async getUser(id) {
      return id === member.id ? member : undefined;
    },
    repository: {
      async createAttempt(stateHash, attempt) {
        attempts.set(stateHash, attempt);
      },
      async claimAttempt(stateHash, claimedAt) {
        const attempt = attempts.get(stateHash);
        if (
          !attempt ||
          attempt.status !== 'pending' ||
          attempt.expiresAt <= claimedAt
        ) {
          return undefined;
        }
        const claimed = { ...attempt, status: 'processing' as const };
        attempts.set(stateHash, claimed);
        return claimed;
      },
      async failAttempt(stateHash) {
        const attempt = attempts.get(stateHash);
        if (attempt) attempts.set(stateHash, { ...attempt, status: 'failed' });
      },
      async completeAttempt(stateHash, identity) {
        const attempt = attempts.get(stateHash);
        assert.ok(attempt);
        links.set(attempt.firebaseUid, identity);
        attempts.set(stateHash, { ...attempt, status: 'succeeded' });
      },
      async getAttempt(firebaseUid, attemptId) {
        return [...attempts.values()].find(
          (attempt) =>
            attempt.firebaseUid === firebaseUid && attempt.attemptId === attemptId,
        );
      },
      async getLink(firebaseUid) {
        return links.get(firebaseUid);
      },
      async unlink(firebaseUid) {
        links.delete(firebaseUid);
        operations.push(`unlink:${firebaseUid}`);
      },
    },
    oauth: {
      async exchangeCode(code, verifier) {
        operations.push(`exchange:${code}:${verifier}`);
        return 'oauth-token';
      },
      async getApiToken(oauthToken) {
        operations.push(`api-token:${oauthToken}`);
        return 'api-jwt';
      },
      async getIdentity(apiToken) {
        operations.push(`identity:${apiToken}`);
        return { inaturalistUserId: 42, login: 'cat_watcher' };
      },
      async revoke(oauthToken) {
        operations.push(`revoke:${oauthToken}`);
      },
    },
  };
  return { attempts, links, operations, value };
}

async function rejectsWithCode(
  operation: () => Promise<unknown>,
  code: HandlerError['code'],
) {
  await assert.rejects(
    operation,
    (error: unknown) => error instanceof HandlerError && error.code === code,
  );
}

describe('iNaturalist account linking', () => {
  it('starts a short-lived, state-bound PKCE authorization for an active user', async () => {
    const { attempts, value } = buildDependencies();
    const result = await handleBeginInaturalistAccountLink(
      { authUid: member.id, data: {} },
      value,
    );

    const authorization = new URL(result.authorizationUrl);
    assert.equal(authorization.origin, 'https://www.inaturalist.org');
    assert.equal(authorization.pathname, '/oauth/authorize');
    assert.equal(authorization.searchParams.get('response_type'), 'code');
    assert.equal(authorization.searchParams.get('client_id'), 'client-id');
    assert.equal(authorization.searchParams.get('scope'), 'login');
    assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256');
    assert.ok(authorization.searchParams.get('code_challenge'));
    const state = authorization.searchParams.get('state');
    assert.ok(state);
    assert.equal(attempts.has(state), false, 'raw state must not be persisted');
    assert.equal(attempts.size, 1);
    const attempt = [...attempts.values()][0];
    assert.equal(attempt?.firebaseUid, member.id);
    assert.equal(attempt?.status, 'pending');
    assert.equal(attempt?.expiresAt.getTime(), now.getTime() + 10 * 60_000);
    assert.equal(result.attemptId, attempt?.attemptId);
  });

  it('rejects missing, unknown, and banned Campus Cats users', async () => {
    const { value } = buildDependencies();
    await rejectsWithCode(
      () => handleBeginInaturalistAccountLink({ data: {} }, value),
      'unauthenticated',
    );
    await rejectsWithCode(
      () =>
        handleBeginInaturalistAccountLink(
          { authUid: 'unknown', data: {} },
          value,
        ),
      'permission-denied',
    );
    value.getUser = async () => ({ ...member, banned: true });
    await rejectsWithCode(
      () =>
        handleBeginInaturalistAccountLink(
          { authUid: member.id, data: {} },
          value,
        ),
      'permission-denied',
    );
  });

  it('verifies identity, revokes the token, and only then completes the link', async () => {
    const { links, operations, value } = buildDependencies();
    const begun = await handleBeginInaturalistAccountLink(
      { authUid: member.id, data: {} },
      value,
    );
    const state = new URL(begun.authorizationUrl).searchParams.get('state');
    assert.ok(state);

    const callback = await handleInaturalistAccountCallback(
      { state, code: 'provider-code' },
      value,
    );

    assert.deepEqual(links.get(member.id), {
      inaturalistUserId: 42,
      login: 'cat_watcher',
    });
    assert.deepEqual(operations.map((operation) => operation.split(':')[0]), [
      'exchange',
      'api-token',
      'identity',
      'revoke',
    ]);
    const returned = new URL(callback.redirectUrl);
    assert.equal(returned.protocol, 'campuscats:');
    assert.equal(returned.searchParams.get('attempt'), begun.attemptId);
    assert.equal(returned.searchParams.get('result'), 'success');
    assert.equal(returned.searchParams.has('code'), false);
  });

  it('rejects replayed and expired state before calling the provider', async () => {
    const { attempts, operations, value } = buildDependencies();
    const begun = await handleBeginInaturalistAccountLink(
      { authUid: member.id, data: {} },
      value,
    );
    const state = new URL(begun.authorizationUrl).searchParams.get('state');
    assert.ok(state);
    await handleInaturalistAccountCallback({ state, code: 'first' }, value);
    const replay = await handleInaturalistAccountCallback(
      { state, code: 'second' },
      value,
    );
    assert.equal(new URL(replay.redirectUrl).searchParams.get('result'), 'error');
    assert.equal(operations.filter((value) => value.startsWith('exchange')).length, 1);

    const second = buildDependencies();
    const expiredBegin = await handleBeginInaturalistAccountLink(
      { authUid: member.id, data: {} },
      second.value,
    );
    for (const [key, attempt] of second.attempts) {
      second.attempts.set(key, {
        ...attempt,
        expiresAt: new Date(now.getTime() - 1),
      });
    }
    const expiredState = new URL(expiredBegin.authorizationUrl).searchParams.get('state');
    assert.ok(expiredState);
    await handleInaturalistAccountCallback(
      { state: expiredState, code: 'expired' },
      second.value,
    );
    assert.deepEqual(second.operations, []);
    assert.equal(attempts.size, 1);
  });

  it('does not link invalid identities or when immediate revocation fails', async () => {
    for (const failure of ['identity', 'revoke'] as const) {
      const { links, value } = buildDependencies();
      if (failure === 'identity') {
        value.oauth.getIdentity = async () => ({
          inaturalistUserId: 0,
          login: '',
        });
      } else {
        value.oauth.revoke = async () => {
          throw new Error('provider unavailable');
        };
      }
      const begun = await handleBeginInaturalistAccountLink(
        { authUid: member.id, data: {} },
        value,
      );
      const state = new URL(begun.authorizationUrl).searchParams.get('state');
      assert.ok(state);
      const result = await handleInaturalistAccountCallback(
        { state, code: 'provider-code' },
        value,
      );
      assert.equal(new URL(result.redirectUrl).searchParams.get('result'), 'error');
      assert.equal(links.size, 0);
    }
  });

  it('returns a generic failure when the provider times out', async () => {
    const { links, value } = buildDependencies();
    value.oauth.exchangeCode = async () => {
      throw new Error('ETIMEDOUT provider-code-should-not-leak');
    };
    const begun = await handleBeginInaturalistAccountLink(
      { authUid: member.id, data: {} },
      value,
    );
    const state = new URL(begun.authorizationUrl).searchParams.get('state');
    assert.ok(state);

    const result = await handleInaturalistAccountCallback(
      { state, code: 'provider-code' },
      value,
    );
    const returned = new URL(result.redirectUrl);
    assert.equal(returned.searchParams.get('result'), 'error');
    assert.equal(returned.searchParams.has('code'), false);
    assert.equal(links.size, 0);
  });

  it('returns only sanitized status and unlinks idempotently', async () => {
    const { value, operations } = buildDependencies();
    const begun = await handleBeginInaturalistAccountLink(
      { authUid: member.id, data: {} },
      value,
    );
    await assert.doesNotReject(() =>
      handleGetInaturalistAccountLinkStatus(
        { authUid: member.id, data: { attemptId: begun.attemptId } },
        value,
      ),
    );
    const state = new URL(begun.authorizationUrl).searchParams.get('state');
    assert.ok(state);
    await handleInaturalistAccountCallback({ state, code: 'code' }, value);
    assert.deepEqual(
      await handleGetInaturalistAccountLinkStatus(
        { authUid: member.id, data: { attemptId: begun.attemptId } },
        value,
      ),
      {
        status: 'linked',
        account: { inaturalistUserId: 42, login: 'cat_watcher' },
      },
    );
    await handleUnlinkInaturalistAccount(
      { authUid: member.id, data: {} },
      value,
    );
    await handleUnlinkInaturalistAccount(
      { authUid: member.id, data: {} },
      value,
    );
    assert.equal(operations.filter((value) => value.startsWith('unlink')).length, 2);
  });
});
