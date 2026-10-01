import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { InaturalistAccountHttpGateway } from './inaturalistAccountHttp';

describe('iNaturalist account OAuth HTTP gateway', () => {
  it('uses the server secret, PKCE verifier, identity JWT, and revocation endpoint', async () => {
    const requests: { readonly url: string; readonly init: RequestInit }[] = [];
    const responses = [
      new Response(JSON.stringify({ access_token: 'oauth-token' })),
      new Response(JSON.stringify({ api_token: 'api-jwt' })),
      new Response(
        JSON.stringify({ results: [{ id: 42, login: 'cat_watcher' }] }),
      ),
      new Response(undefined, { status: 200 }),
    ];
    const gateway = new InaturalistAccountHttpGateway(
      {
        clientId: 'client-id',
        clientSecret: 'server-secret',
        redirectUri: 'https://cats.example/oauth/inaturalist/callback',
      },
      async (input, init) => {
        requests.push({ url: String(input), init: init ?? {} });
        const response = responses.shift();
        assert.ok(response);
        return response;
      },
    );

    const oauthToken = await gateway.exchangeCode('provider-code', 'pkce-verifier');
    const apiToken = await gateway.getApiToken(oauthToken);
    const identity = await gateway.getIdentity(apiToken);
    await gateway.revoke(oauthToken);

    assert.deepEqual(identity, {
      inaturalistUserId: 42,
      login: 'cat_watcher',
    });
    assert.equal(requests[0]?.url, 'https://www.inaturalist.org/oauth/token');
    const exchange = new URLSearchParams(String(requests[0]?.init.body));
    assert.equal(exchange.get('client_secret'), 'server-secret');
    assert.equal(exchange.get('code_verifier'), 'pkce-verifier');
    assert.equal(
      (requests[1]?.init.headers as Record<string, string>).Authorization,
      'Bearer oauth-token',
    );
    assert.equal(
      (requests[2]?.init.headers as Record<string, string>).Authorization,
      'api-jwt',
    );
    assert.equal(requests[3]?.url, 'https://www.inaturalist.org/oauth/revoke');
    const revocation = new URLSearchParams(String(requests[3]?.init.body));
    assert.equal(revocation.get('token'), 'oauth-token');
    assert.equal(revocation.get('client_secret'), 'server-secret');
  });

  it('rejects failed requests and ambiguous identity payloads', async () => {
    const failed = new InaturalistAccountHttpGateway(
      { clientId: 'id', clientSecret: 'secret', redirectUri: 'https://example.com' },
      async () => new Response('unavailable', { status: 503 }),
    );
    await assert.rejects(() => failed.exchangeCode('code', 'verifier'));

    const ambiguous = new InaturalistAccountHttpGateway(
      { clientId: 'id', clientSecret: 'secret', redirectUri: 'https://example.com' },
      async () =>
        new Response(
          JSON.stringify({
            results: [
              { id: 42, login: 'first' },
              { id: 43, login: 'second' },
            ],
          }),
        ),
    );
    await assert.rejects(() => ambiguous.getIdentity('api-jwt'));
  });
});
