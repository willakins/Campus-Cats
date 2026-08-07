import { createHash, randomBytes as nodeRandomBytes } from 'node:crypto';

import { HandlerError, ManagedUser } from './handlers';

const AUTHORIZATION_ENDPOINT = 'https://www.inaturalist.org/oauth/authorize';
const LINK_LIFETIME_MILLIS = 10 * 60_000;

export type InaturalistLinkAttemptStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed';

export interface InaturalistLinkAttempt {
  readonly firebaseUid: string;
  readonly attemptId: string;
  readonly codeVerifier: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly status: InaturalistLinkAttemptStatus;
}

export interface InaturalistLinkIdentity {
  readonly inaturalistUserId: number;
  readonly login: string;
}

export interface InaturalistAccountLinkRepository {
  createAttempt(
    stateHash: string,
    attempt: InaturalistLinkAttempt,
  ): Promise<void>;
  claimAttempt(
    stateHash: string,
    claimedAt: Date,
  ): Promise<InaturalistLinkAttempt | undefined>;
  failAttempt(stateHash: string): Promise<void>;
  completeAttempt(
    stateHash: string,
    identity: InaturalistLinkIdentity,
    completedAt: Date,
  ): Promise<void>;
  getAttempt(
    firebaseUid: string,
    attemptId: string,
  ): Promise<InaturalistLinkAttempt | undefined>;
  getLink(firebaseUid: string): Promise<InaturalistLinkIdentity | undefined>;
  unlink(firebaseUid: string): Promise<void>;
}

export interface InaturalistAccountOAuthGateway {
  exchangeCode(code: string, codeVerifier: string): Promise<string>;
  getApiToken(oauthToken: string): Promise<string>;
  getIdentity(apiToken: string): Promise<InaturalistLinkIdentity>;
  revoke(oauthToken: string): Promise<void>;
}

export interface InaturalistAccountLinkingDependencies {
  readonly config: {
    readonly clientId: string;
    readonly clientSecret: string;
    readonly redirectUri: string;
    readonly appReturnUri: string;
  };
  readonly repository: InaturalistAccountLinkRepository;
  readonly oauth: InaturalistAccountOAuthGateway;
  readonly now: () => Date;
  readonly randomBytes?: (size: number) => Buffer;
  getUser(id: string): Promise<ManagedUser | undefined>;
}

interface HandlerRequest<T> {
  readonly authUid?: string;
  readonly data: T;
}

export interface InaturalistAccountLinkStatus {
  readonly status: 'unlinked' | 'pending' | 'failed' | 'linked';
  readonly account?: InaturalistLinkIdentity;
}

export async function handleBeginInaturalistAccountLink(
  request: HandlerRequest<Record<string, never>>,
  dependencies: InaturalistAccountLinkingDependencies,
): Promise<{ readonly authorizationUrl: string; readonly attemptId: string }> {
  const user = await requireActiveUser(request.authUid, dependencies);
  requirePublicConfiguration(dependencies);
  const bytes = dependencies.randomBytes ?? nodeRandomBytes;
  const state = base64Url(bytes(32));
  const attemptId = base64Url(bytes(32));
  const codeVerifier = base64Url(bytes(32));
  const createdAt = dependencies.now();
  await dependencies.repository.createAttempt(hash(state), {
    firebaseUid: user.id,
    attemptId,
    codeVerifier,
    createdAt,
    expiresAt: new Date(createdAt.getTime() + LINK_LIFETIME_MILLIS),
    status: 'pending',
  });

  const authorizationUrl = new URL(AUTHORIZATION_ENDPOINT);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('client_id', dependencies.config.clientId);
  authorizationUrl.searchParams.set('redirect_uri', dependencies.config.redirectUri);
  authorizationUrl.searchParams.set('scope', 'login');
  authorizationUrl.searchParams.set('state', state);
  authorizationUrl.searchParams.set(
    'code_challenge',
    base64Url(createHash('sha256').update(codeVerifier).digest()),
  );
  authorizationUrl.searchParams.set('code_challenge_method', 'S256');
  return { authorizationUrl: authorizationUrl.toString(), attemptId };
}

export async function handleInaturalistAccountCallback(
  query: {
    readonly state?: unknown;
    readonly code?: unknown;
    readonly error?: unknown;
  },
  dependencies: InaturalistAccountLinkingDependencies,
): Promise<{ readonly redirectUrl: string }> {
  const state = typeof query.state === 'string' ? query.state : '';
  const stateHash = hash(state);
  const attempt = state
    ? await dependencies.repository.claimAttempt(stateHash, dependencies.now())
    : undefined;
  if (!attempt) return { redirectUrl: callbackRedirect(dependencies, 'error') };

  if (typeof query.error === 'string' || typeof query.code !== 'string') {
    await dependencies.repository.failAttempt(stateHash);
    return {
      redirectUrl: callbackRedirect(dependencies, 'error', attempt.attemptId),
    };
  }

  let oauthToken: string | undefined;
  let revocationAttempted = false;
  try {
    requireProviderConfiguration(dependencies);
    oauthToken = await dependencies.oauth.exchangeCode(
      query.code,
      attempt.codeVerifier,
    );
    const apiToken = await dependencies.oauth.getApiToken(oauthToken);
    const identity = validIdentity(
      await dependencies.oauth.getIdentity(apiToken),
    );
    revocationAttempted = true;
    await dependencies.oauth.revoke(oauthToken);
    await dependencies.repository.completeAttempt(
      stateHash,
      identity,
      dependencies.now(),
    );
    return {
      redirectUrl: callbackRedirect(
        dependencies,
        'success',
        attempt.attemptId,
      ),
    };
  } catch {
    if (oauthToken && !revocationAttempted) {
      try {
        await dependencies.oauth.revoke(oauthToken);
      } catch {
        // The link still fails. Never retain or expose the token as a fallback.
      }
    }
    await dependencies.repository.failAttempt(stateHash);
    return {
      redirectUrl: callbackRedirect(dependencies, 'error', attempt.attemptId),
    };
  }
}

export async function handleGetInaturalistAccountLinkStatus(
  request: HandlerRequest<{ readonly attemptId?: unknown }>,
  dependencies: InaturalistAccountLinkingDependencies,
): Promise<InaturalistAccountLinkStatus> {
  const user = await requireActiveUser(request.authUid, dependencies);
  const link = await dependencies.repository.getLink(user.id);
  if (link) return { status: 'linked', account: validIdentity(link) };
  if (typeof request.data.attemptId !== 'string' || !request.data.attemptId) {
    return { status: 'unlinked' };
  }
  const attempt = await dependencies.repository.getAttempt(
    user.id,
    request.data.attemptId,
  );
  if (!attempt) return { status: 'unlinked' };
  return {
    status:
      attempt.status === 'pending' || attempt.status === 'processing'
        ? 'pending'
        : attempt.status === 'failed'
          ? 'failed'
          : 'unlinked',
  };
}

export async function handleUnlinkInaturalistAccount(
  request: HandlerRequest<Record<string, never>>,
  dependencies: InaturalistAccountLinkingDependencies,
): Promise<{ readonly success: true }> {
  const user = await requireActiveUser(request.authUid, dependencies);
  await dependencies.repository.unlink(user.id);
  return { success: true };
}

async function requireActiveUser(
  uid: string | undefined,
  dependencies: Pick<InaturalistAccountLinkingDependencies, 'getUser'>,
): Promise<ManagedUser> {
  if (!uid) throw new HandlerError('unauthenticated', 'Authentication required');
  const user = await dependencies.getUser(uid);
  if (!user || user.banned) {
    throw new HandlerError('permission-denied', 'An active membership is required');
  }
  return user;
}

function validIdentity(identity: InaturalistLinkIdentity): InaturalistLinkIdentity {
  if (
    !Number.isInteger(identity.inaturalistUserId) ||
    identity.inaturalistUserId <= 0 ||
    typeof identity.login !== 'string' ||
    !identity.login.trim()
  ) {
    throw new HandlerError('failed-precondition', 'Provider identity is invalid');
  }
  return {
    inaturalistUserId: identity.inaturalistUserId,
    login: identity.login.trim(),
  };
}

function callbackRedirect(
  dependencies: InaturalistAccountLinkingDependencies,
  result: 'success' | 'error',
  attemptId?: string,
): string {
  const url = new URL(dependencies.config.appReturnUri);
  url.searchParams.set('result', result);
  if (attemptId) url.searchParams.set('attempt', attemptId);
  return url.toString();
}

function requirePublicConfiguration(
  dependencies: InaturalistAccountLinkingDependencies,
): void {
  if (
    !dependencies.config.clientId ||
    !dependencies.config.redirectUri ||
    !dependencies.config.appReturnUri
  ) {
    throw new HandlerError(
      'failed-precondition',
      'iNaturalist account linking is not configured',
    );
  }
}

function requireProviderConfiguration(
  dependencies: InaturalistAccountLinkingDependencies,
): void {
  requirePublicConfiguration(dependencies);
  if (!dependencies.config.clientSecret) {
    throw new HandlerError(
      'failed-precondition',
      'iNaturalist account linking is not configured',
    );
  }
}

function base64Url(value: Buffer): string {
  return value.toString('base64url');
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
