import { HandlerError } from './handlers';
import {
  ClubSetupRequestRecord,
  ClubSetupRequestRepository,
} from './universityOnboarding';

type RequestStatus =
  | 'pending'
  | 'provisioning'
  | 'completed'
  | 'email_failed';

interface StoredRequest {
  readonly request: ClubSetupRequestRecord;
  status: RequestStatus;
  updatedAt: Date;
  completedClubId?: string;
}

interface Claim {
  readonly requestId: string;
  status: 'pending' | 'provisioning' | 'provisioned';
  expiresAt: Date;
}

interface RateLimit {
  count: number;
  readonly expiresAt: Date;
}

/** Deterministic contract adapter for the server-managed onboarding store. */
export class InMemoryClubSetupRequestRepository
implements ClubSetupRequestRepository {
  private readonly requests = new Map<string, StoredRequest>();
  private readonly claims = new Map<string, Claim>();
  private readonly mappings = new Set<string>();
  private readonly rateLimits = new Map<string, RateLimit>();

  constructor(private readonly now: () => Date) {}

  async begin(request: ClubSetupRequestRecord): Promise<void> {
    const now = this.now();
    const claim = this.claims.get(request.universityId);
    if (
      this.mappings.has(request.universityId) ||
      (claim && claim.expiresAt.getTime() > now.getTime())
    ) {
      throw duplicateSetupError();
    }

    const hour = now.toISOString().slice(0, 13);
    const day = now.toISOString().slice(0, 10);
    const ipKey = `ip-${request.clientIpHash}-${hour}`;
    const emailKey = `email-${request.emailHash}-${day}`;
    const ipCount = this.activeCount(ipKey, now);
    const emailCount = this.activeCount(emailKey, now);
    if (ipCount >= 5 || emailCount >= 3) {
      throw new HandlerError(
        'failed-precondition',
        'Too many club setup requests. Please try again later',
      );
    }

    this.requests.set(request.id, {
      request: { ...request },
      status: 'pending',
      updatedAt: now,
    });
    this.claims.set(request.universityId, {
      requestId: request.id,
      status: 'pending',
      expiresAt: request.expiresAt,
    });
    this.rateLimits.set(ipKey, {
      count: ipCount + 1,
      expiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
    });
    this.rateLimits.set(emailKey, {
      count: emailCount + 1,
      expiresAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
    });
  }

  async cancel(requestId: string): Promise<void> {
    const stored = this.requests.get(requestId);
    if (!stored) return;
    stored.status = 'email_failed';
    stored.updatedAt = this.now();
    if (this.claims.get(stored.request.universityId)?.requestId === requestId) {
      this.claims.delete(stored.request.universityId);
    }
  }

  async loadForVerification(
    requestId: string,
    tokenHash: string,
  ): Promise<ClubSetupRequestRecord> {
    const stored = this.requests.get(requestId);
    if (!stored) {
      throw new HandlerError('not-found', 'Club setup request not found');
    }
    const now = this.now();
    if (stored.request.expiresAt.getTime() <= now.getTime()) {
      throw new HandlerError(
        'failed-precondition',
        'This verification link has expired',
      );
    }
    if (stored.request.tokenHash !== tokenHash) {
      throw new HandlerError(
        'permission-denied',
        'This verification link is invalid',
      );
    }
    if (stored.status === 'completed') {
      throw new HandlerError(
        'failed-precondition',
        'This verification link has already been used',
      );
    }
    const claim = this.claims.get(stored.request.universityId);
    if (!claim || claim.requestId !== requestId) {
      throw new HandlerError(
        'failed-precondition',
        'This setup request is no longer active',
      );
    }
    if (
      stored.status === 'provisioning' &&
      now.getTime() - stored.updatedAt.getTime() < 15 * 60 * 1000
    ) {
      throw new HandlerError(
        'failed-precondition',
        'This verification request is already being processed',
      );
    }
    if (stored.status !== 'pending' && stored.status !== 'provisioning') {
      throw new HandlerError(
        'failed-precondition',
        'This setup request is no longer active',
      );
    }
    stored.status = 'provisioning';
    stored.updatedAt = now;
    claim.status = 'provisioning';
    claim.expiresAt = new Date(Math.max(
      claim.expiresAt.getTime(),
      now.getTime() + 24 * 60 * 60 * 1000,
    ));
    return { ...stored.request };
  }

  async complete(requestId: string, clubId: string): Promise<void> {
    const stored = this.requests.get(requestId);
    if (!stored) {
      throw new HandlerError('not-found', 'Club setup request not found');
    }
    const claim = this.claims.get(stored.request.universityId);
    if (!claim || claim.requestId !== requestId) {
      throw new HandlerError(
        'failed-precondition',
        'This setup request no longer owns the university claim',
      );
    }
    const now = this.now();
    stored.status = 'completed';
    stored.updatedAt = now;
    stored.completedClubId = clubId;
    claim.status = 'provisioned';
    claim.expiresAt = new Date(now.getTime() + 3650 * 24 * 60 * 60 * 1000);
    this.mappings.add(stored.request.universityId);
  }

  async fail(requestId: string): Promise<void> {
    const stored = this.requests.get(requestId);
    if (!stored || stored.status !== 'provisioning') return;
    const claim = this.claims.get(stored.request.universityId);
    if (!claim || claim.requestId !== requestId) return;
    stored.status = 'pending';
    stored.updatedAt = this.now();
    claim.status = 'pending';
    claim.expiresAt = stored.request.expiresAt;
  }

  seedMappedUniversity(universityId: string): void {
    this.mappings.add(universityId);
  }

  status(requestId: string): RequestStatus | undefined {
    return this.requests.get(requestId)?.status;
  }

  claimOwner(universityId: string): string | undefined {
    return this.claims.get(universityId)?.requestId;
  }

  private activeCount(key: string, now: Date): number {
    const limit = this.rateLimits.get(key);
    return limit && limit.expiresAt.getTime() > now.getTime() ? limit.count : 0;
  }
}

const duplicateSetupError = (): HandlerError =>
  new HandlerError(
    'already-exists',
    'Club setup is already in progress or complete for this university',
  );
