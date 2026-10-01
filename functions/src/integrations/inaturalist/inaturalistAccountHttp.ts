import {
  InaturalistAccountOAuthGateway,
  InaturalistLinkIdentity,
} from './inaturalistAccountLinking';

const REQUEST_TIMEOUT_MILLIS = 10_000;

interface OAuthConfiguration {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
}

export class InaturalistAccountHttpGateway
  implements InaturalistAccountOAuthGateway
{
  constructor(
    private readonly config: OAuthConfiguration,
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {}

  async exchangeCode(code: string, codeVerifier: string): Promise<string> {
    const response = await this.postForm('https://www.inaturalist.org/oauth/token', {
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      code,
      code_verifier: codeVerifier,
    });
    return requiredString((await response.json() as Record<string, unknown>).access_token);
  }

  async getApiToken(oauthToken: string): Promise<string> {
    const response = await this.fetchOk(
      'https://www.inaturalist.org/users/api_token',
      {
        headers: { Authorization: `Bearer ${oauthToken}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLIS),
      },
    );
    return requiredString((await response.json() as Record<string, unknown>).api_token);
  }

  async getIdentity(apiToken: string): Promise<InaturalistLinkIdentity> {
    const response = await this.fetchOk(
      'https://api.inaturalist.org/v2/users/me?fields=id,login',
      {
        headers: { Authorization: apiToken },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLIS),
      },
    );
    const payload = await response.json() as Record<string, unknown>;
    if (!Array.isArray(payload.results) || payload.results.length !== 1) {
      throw new Error('Provider returned an invalid identity');
    }
    const result = payload.results[0] as Record<string, unknown>;
    return {
      inaturalistUserId: Number(result.id),
      login: requiredString(result.login),
    };
  }

  async revoke(oauthToken: string): Promise<void> {
    await this.postForm('https://www.inaturalist.org/oauth/revoke', {
      token: oauthToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });
  }

  private postForm(
    url: string,
    values: Readonly<Record<string, string>>,
  ): Promise<Response> {
    return this.fetchOk(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(values).toString(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLIS),
    });
  }

  private async fetchOk(url: string, init: RequestInit): Promise<Response> {
    const response = await this.fetchImplementation(url, init);
    if (!response.ok) throw new Error('iNaturalist request failed');
    return response;
  }
}

function requiredString(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Provider response is invalid');
  }
  return value.trim();
}
