import { timingSafeEqual } from 'node:crypto';

import { Firestore, Timestamp } from 'firebase-admin/firestore';

import { ClubProvisioningRequest, ProvisionedClub } from './clubProvisioning';
import { HandlerError } from './handlers';
import { UniversitySearchResult } from './universityCatalog';

export interface ClubSetupRequestRecord extends ClubProvisioningRequest {
  readonly id: string;
  readonly universityId: string;
  readonly universityName: string;
  readonly tokenHash: string;
  readonly clientIpHash: string;
  readonly emailHash: string;
  readonly expiresAt: Date;
}

export interface ClubSetupRequestRepository {
  begin(request: ClubSetupRequestRecord): Promise<void>;
  cancel(requestId: string): Promise<void>;
  loadForVerification(requestId: string, tokenHash: string): Promise<ClubSetupRequestRecord>;
  complete(requestId: string, clubId: string): Promise<void>;
  fail(requestId: string): Promise<void>;
}

export interface UniversityOnboardingDependencies {
  readonly catalog: {
    search(query: string): Promise<readonly UniversitySearchResult[]>;
    get(universityId: string): Promise<UniversitySearchResult | undefined>;
  };
  readonly requests: ClubSetupRequestRepository;
  readonly provision: (request: ClubProvisioningRequest) => Promise<ProvisionedClub>;
  readonly sendVerification: (
    email: string,
    clubName: string,
    requestId: string,
    token: string,
  ) => Promise<void>;
  readonly newId: () => string;
  readonly newToken: () => string;
  readonly hash: (value: string) => string;
  readonly now: () => Date;
}

interface RequestContext<T> {
  readonly data: T;
  readonly clientIp?: string;
}

export const handleSearchUniversities = async (
  request: RequestContext<{ readonly query?: unknown }>,
  dependencies: UniversityOnboardingDependencies,
): Promise<readonly UniversitySearchResult[]> => {
  const query = requiredString(request.data.query, 'query').replace(/\s+/g, ' ');
  if (query.length < 2 || query.length > 100) return [];
  return dependencies.catalog.search(query);
};

export const handleGetUniversity = async (
  request: RequestContext<{ readonly universityId?: unknown }>,
  dependencies: UniversityOnboardingDependencies,
): Promise<UniversitySearchResult | null> => {
  const universityId = scorecardId(request.data.universityId);
  return (await dependencies.catalog.get(universityId)) ?? null;
};

export const handleRequestClubSetup = async (
  request: RequestContext<{
    readonly universityId?: unknown;
    readonly clubName?: unknown;
    readonly primaryColor?: unknown;
    readonly accentColor?: unknown;
    readonly presidentEmail?: unknown;
  }>,
  dependencies: UniversityOnboardingDependencies,
): Promise<{
  readonly requestId: string;
  readonly universityId: string;
  readonly maskedEmail: string;
  readonly expiresAt: string;
}> => {
  const universityId = scorecardId(request.data.universityId);
  const clubName = boundedString(request.data.clubName, 'clubName', 160);
  const primaryColor = color(request.data.primaryColor, 'primaryColor');
  const accentColor = color(request.data.accentColor, 'accentColor');
  const presidentEmail = email(request.data.presidentEmail);
  const university = await dependencies.catalog.get(universityId);
  if (!university) throw new HandlerError('not-found', 'University not found');
  if (university.status !== 'unclaimed') {
    throw new HandlerError(
      'already-exists',
      'Club setup is already in progress or complete for this university',
    );
  }
  if (!university.timezone || university.emailDomains.length === 0) {
    throw new HandlerError(
      'failed-precondition',
      'This university needs a verified location and email domain before setup',
    );
  }
  if (!emailMatchesDomains(presidentEmail, university.emailDomains)) {
    throw new HandlerError(
      'invalid-argument',
      `Use a President email from ${university.emailDomains.join(' or ')}`,
    );
  }
  const now = dependencies.now();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const requestId = dependencies.newId();
  const token = dependencies.newToken();
  const record: ClubSetupRequestRecord = {
    id: requestId,
    universityId,
    universityName: university.name,
    clubName,
    timezone: university.timezone,
    presidentEmail,
    primaryColor,
    accentColor,
    tokenHash: dependencies.hash(token),
    clientIpHash: dependencies.hash(request.clientIp ?? 'unknown'),
    emailHash: dependencies.hash(presidentEmail),
    expiresAt,
  };
  await dependencies.requests.begin(record);
  try {
    await dependencies.sendVerification(
      presidentEmail,
      clubName,
      requestId,
      token,
    );
  } catch (error) {
    await dependencies.requests.cancel(requestId).catch(() => undefined);
    throw error;
  }
  return {
    requestId,
    universityId,
    maskedEmail: maskEmail(presidentEmail),
    expiresAt: expiresAt.toISOString(),
  };
};

export const handleVerifyClubSetup = async (
  request: RequestContext<{
    readonly requestId?: unknown;
    readonly token?: unknown;
  }>,
  dependencies: UniversityOnboardingDependencies,
): Promise<{
  readonly university: UniversitySearchResult;
  readonly passwordSetupSent: true;
}> => {
  const requestId = boundedString(request.data.requestId, 'requestId', 120);
  const token = boundedString(request.data.token, 'token', 500);
  const record = await dependencies.requests.loadForVerification(
    requestId,
    dependencies.hash(token),
  );
  try {
    const club = await dependencies.provision(record);
    await dependencies.requests.complete(requestId, club.clubId);
  } catch (error) {
    // Keep the single-university claim while allowing the same verified link to
    // retry transient provisioning or email-delivery failures.
    await dependencies.requests.fail(requestId).catch(() => undefined);
    throw error;
  }
  const university = await dependencies.catalog.get(record.universityId);
  if (!university?.club) {
    throw new HandlerError('internal', 'The club mapping could not be loaded');
  }
  return { university, passwordSetupSent: true };
};

export class FirebaseClubSetupRequestRepository implements ClubSetupRequestRepository {
  constructor(
    private readonly firestore: Firestore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async begin(request: ClubSetupRequestRecord): Promise<void> {
    const claimReference = this.firestore
      .collection('university-club-claims')
      .doc(request.universityId);
    const mappingReference = this.firestore
      .collection('university-clubs')
      .doc(request.universityId);
    const requestReference = this.firestore
      .collection('club-onboarding-requests')
      .doc(request.id);
    const hour = this.now().toISOString().slice(0, 13);
    const day = this.now().toISOString().slice(0, 10);
    const ipLimitReference = this.firestore
      .collection('club-onboarding-rate-limits')
      .doc(`ip-${request.clientIpHash}-${hour}`);
    const emailLimitReference = this.firestore
      .collection('club-onboarding-rate-limits')
      .doc(`email-${request.emailHash}-${day}`);
    await this.firestore.runTransaction(async (transaction) => {
      const [claim, mapping, ipLimit, emailLimit] = await Promise.all([
        transaction.get(claimReference),
        transaction.get(mappingReference),
        transaction.get(ipLimitReference),
        transaction.get(emailLimitReference),
      ]);
      if (mapping.exists) {
        throw duplicateSetupError();
      }
      const claimExpiry = claim.data()?.expiresAt;
      if (
        claim.exists &&
        claimExpiry instanceof Timestamp &&
        claimExpiry.toDate().getTime() > this.now().getTime()
      ) {
        throw duplicateSetupError();
      }
      const ipCount = numericCount(ipLimit.data()?.count);
      const emailCount = numericCount(emailLimit.data()?.count);
      if (ipCount >= 5 || emailCount >= 3) {
        throw new HandlerError(
          'failed-precondition',
          'Too many club setup requests. Please try again later',
        );
      }
      const createdAt = Timestamp.fromDate(this.now());
      const expiresAt = Timestamp.fromDate(request.expiresAt);
      transaction.set(requestReference, {
        universityId: request.universityId,
        universityName: request.universityName,
        clubName: request.clubName,
        timezone: request.timezone,
        presidentEmail: request.presidentEmail,
        primaryColor: request.primaryColor,
        accentColor: request.accentColor,
        tokenHash: request.tokenHash,
        status: 'pending',
        createdAt,
        expiresAt,
      });
      transaction.set(claimReference, {
        requestId: request.id,
        status: 'pending',
        createdAt,
        expiresAt,
      });
      transaction.set(ipLimitReference, {
        count: ipCount + 1,
        expiresAt: Timestamp.fromMillis(this.now().getTime() + 2 * 60 * 60 * 1000),
      });
      transaction.set(emailLimitReference, {
        count: emailCount + 1,
        expiresAt: Timestamp.fromMillis(this.now().getTime() + 2 * 24 * 60 * 60 * 1000),
      });
    });
  }

  async cancel(requestId: string): Promise<void> {
    const requestReference = this.firestore
      .collection('club-onboarding-requests')
      .doc(requestId);
    await this.firestore.runTransaction(async (transaction) => {
      const request = await transaction.get(requestReference);
      if (!request.exists) return;
      const universityId = request.data()?.universityId;
      if (typeof universityId !== 'string') return;
      const claimReference = this.firestore
        .collection('university-club-claims')
        .doc(universityId);
      const claim = await transaction.get(claimReference);
      transaction.update(requestReference, { status: 'email_failed' });
      if (claim.data()?.requestId === requestId) transaction.delete(claimReference);
    });
  }

  async loadForVerification(
    requestId: string,
    tokenHash: string,
  ): Promise<ClubSetupRequestRecord> {
    const reference = this.firestore
      .collection('club-onboarding-requests')
      .doc(requestId);
    return this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const data = snapshot.data();
      if (!snapshot.exists || !data) {
        throw new HandlerError('not-found', 'Club setup request not found');
      }
      const now = this.now();
      const expiresAt = data.expiresAt;
      if (!(expiresAt instanceof Timestamp) || expiresAt.toDate() <= now) {
        throw new HandlerError('failed-precondition', 'This verification link has expired');
      }
      if (typeof data.tokenHash !== 'string' || !safeEqual(data.tokenHash, tokenHash)) {
        throw new HandlerError('permission-denied', 'This verification link is invalid');
      }
      if (data.status === 'completed') {
        throw new HandlerError(
          'failed-precondition',
          'This verification link has already been used',
        );
      }
      const universityId = scorecardId(data.universityId);
      const claimReference = this.firestore
        .collection('university-club-claims')
        .doc(universityId);
      const claim = await transaction.get(claimReference);
      if (!claim.exists || claim.data()?.requestId !== requestId) {
        throw new HandlerError(
          'failed-precondition',
          'This setup request is no longer active',
        );
      }
      if (data.status !== 'pending' && data.status !== 'provisioning') {
        throw new HandlerError('failed-precondition', 'This setup request is no longer active');
      }
      const updatedAt = data.updatedAt;
      if (
        data.status === 'provisioning' &&
        updatedAt instanceof Timestamp &&
        now.getTime() - updatedAt.toMillis() < PROVISIONING_LEASE_MS
      ) {
        throw new HandlerError(
          'failed-precondition',
          'This verification request is already being processed',
        );
      }
      const leaseExpiresAt = Timestamp.fromMillis(
        Math.max(expiresAt.toMillis(), now.getTime() + 24 * 60 * 60 * 1000),
      );
      transaction.set(
        reference,
        { status: 'provisioning', updatedAt: Timestamp.fromDate(now) },
        { merge: true },
      );
      transaction.set(
        claimReference,
        {
          requestId,
          status: 'provisioning',
          expiresAt: leaseExpiresAt,
          updatedAt: Timestamp.fromDate(now),
        },
        { merge: true },
      );
      return storedRequest(requestId, data, expiresAt.toDate());
    });
  }

  async complete(requestId: string, clubId: string): Promise<void> {
    const reference = this.firestore
      .collection('club-onboarding-requests')
      .doc(requestId);
    await this.firestore.runTransaction(async (transaction) => {
      const request = await transaction.get(reference);
      const universityId = request.data()?.universityId;
      if (typeof universityId !== 'string') {
        throw new HandlerError('not-found', 'Club setup request not found');
      }
      const claimReference = this.firestore
        .collection('university-club-claims')
        .doc(universityId);
      const claim = await transaction.get(claimReference);
      if (!claim.exists || claim.data()?.requestId !== requestId) {
        throw new HandlerError(
          'failed-precondition',
          'This setup request no longer owns the university claim',
        );
      }
      const completedAt = Timestamp.fromDate(this.now());
      transaction.set(reference, {
        status: 'completed',
        clubId,
        completedAt,
      }, { merge: true });
      transaction.set(
        claimReference,
        {
          requestId,
          clubId,
          status: 'provisioned',
          completedAt,
          expiresAt: Timestamp.fromMillis(
            completedAt.toMillis() + 3650 * 24 * 60 * 60 * 1000,
          ),
        },
        { merge: true },
      );
    });
  }

  async fail(requestId: string): Promise<void> {
    const reference = this.firestore
      .collection('club-onboarding-requests')
      .doc(requestId);
    await this.firestore.runTransaction(async (transaction) => {
      const request = await transaction.get(reference);
      const data = request.data();
      if (!request.exists || data?.status !== 'provisioning') return;
      const universityId = data.universityId;
      if (typeof universityId !== 'string') return;
      const claimReference = this.firestore
        .collection('university-club-claims')
        .doc(universityId);
      const claim = await transaction.get(claimReference);
      if (!claim.exists || claim.data()?.requestId !== requestId) return;
      const updatedAt = Timestamp.fromDate(this.now());
      transaction.set(
        reference,
        { status: 'pending', updatedAt },
        { merge: true },
      );
      transaction.set(
        claimReference,
        {
          requestId,
          status: 'pending',
          expiresAt: data.expiresAt,
          updatedAt,
        },
        { merge: true },
      );
    });
  }
}

const storedRequest = (
  id: string,
  data: Record<string, unknown>,
  expiresAt: Date,
): ClubSetupRequestRecord => ({
  id,
  universityId: scorecardId(data.universityId),
  universityName: boundedString(data.universityName, 'universityName', 200),
  clubName: boundedString(data.clubName, 'clubName', 160),
  timezone: boundedString(data.timezone, 'timezone', 100),
  presidentEmail: email(data.presidentEmail),
  primaryColor: color(data.primaryColor, 'primaryColor'),
  accentColor: color(data.accentColor, 'accentColor'),
  tokenHash: boundedString(data.tokenHash, 'tokenHash', 128),
  clientIpHash: '',
  emailHash: '',
  expiresAt,
});

const PROVISIONING_LEASE_MS = 15 * 60 * 1000;

const duplicateSetupError = (): HandlerError =>
  new HandlerError(
    'already-exists',
    'Club setup is already in progress or complete for this university',
  );

const emailMatchesDomains = (address: string, domains: readonly string[]): boolean => {
  const domain = address.split('@')[1]?.toLowerCase();
  return Boolean(domain) && domains.some((approved) =>
    domain === approved.toLowerCase() || domain?.endsWith(`.${approved.toLowerCase()}`));
};

const scorecardId = (value: unknown): string => {
  const id = requiredString(value, 'universityId');
  if (!/^\d{1,20}$/.test(id)) {
    throw new HandlerError('invalid-argument', 'Select a university from search results');
  }
  return id;
};

const color = (value: unknown, field: string): string => {
  const parsed = requiredString(value, field).toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(parsed)) {
    throw new HandlerError('invalid-argument', `${field} must be a six-digit hex color`);
  }
  return parsed;
};

const email = (value: unknown): string => {
  const parsed = boundedString(value, 'presidentEmail', 320).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(parsed)) {
    throw new HandlerError('invalid-argument', 'Enter a valid President email');
  }
  return parsed;
};

const requiredString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HandlerError('invalid-argument', `${field} is required`);
  }
  return value.trim();
};

const boundedString = (value: unknown, field: string, maximum: number): string => {
  const parsed = requiredString(value, field);
  if (parsed.length > maximum) {
    throw new HandlerError('invalid-argument', `${field} is too long`);
  }
  return parsed;
};

const maskEmail = (address: string): string => {
  const [local, domain] = address.split('@');
  return `${local?.slice(0, 1) ?? ''}***@${domain ?? ''}`;
};

const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

const numericCount = (value: unknown): number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
