import { Auth, UserRecord } from 'firebase-admin/auth';
import { Firestore, Timestamp } from 'firebase-admin/firestore';

export interface ClubProvisioningRequest {
  readonly universityId?: string;
  readonly universityName?: string;
  readonly clubId?: string;
  readonly clubName: string;
  readonly timezone: string;
  readonly presidentEmail: string;
  readonly billingEmail?: string;
  readonly primaryColor: string;
  readonly accentColor: string;
}

export interface ProvisionedClub {
  readonly clubId: string;
  readonly clubName: string;
  readonly presidentUserId: string;
}

interface Dependencies {
  readonly firestore: Firestore;
  readonly auth: Auth;
  readonly webOrigin: () => string;
  readonly sendPasswordSetup: (
    email: string,
    clubName: string,
    link: string,
  ) => Promise<void>;
  readonly now?: () => Date;
}

export class ClubProvisioningService {
  private readonly now: () => Date;

  constructor(private readonly dependencies: Dependencies) {
    this.now = dependencies.now ?? (() => new Date());
  }

  async provision(request: ClubProvisioningRequest): Promise<ProvisionedClub> {
    const clubId = request.clubId ?? (
      request.universityId
        ? clubIdForUniversity(request.universityId)
        : undefined
    );
    if (!clubId) throw new Error('Club identity is required');
    const { auth, firestore } = this.dependencies;
    const billingEmail = request.billingEmail ?? request.presidentEmail;
    const { user, created } = await this.findOrCreateUser(request.presidentEmail);
    let profileProvisioned = false;
    try {
      const userReference = firestore.collection('users').doc(user.uid);
      const clubReference = firestore.collection('clubs').doc(clubId);
      const mappingReference = request.universityId
        ? firestore.collection('university-clubs').doc(request.universityId)
        : undefined;
      const presidents = firestore
        .collection('users')
        .where('clubId', '==', clubId)
        .where('role', '==', 3);
      const now = Timestamp.fromDate(this.now());
      await firestore.runTransaction(async (transaction) => {
        const [club, existingUser, mapping, existingPresidents] = await Promise.all([
          transaction.get(clubReference),
          transaction.get(userReference),
          mappingReference ? transaction.get(mappingReference) : Promise.resolve(undefined),
          transaction.get(presidents),
        ]);
        if (
          existingUser.exists &&
          typeof existingUser.data()?.clubId === 'string' &&
          existingUser.data()?.clubId !== clubId
        ) {
          throw new Error('The President account already belongs to another club');
        }
        if (existingPresidents.docs.some((president) => president.id !== user.uid)) {
          throw new Error('The club already has a different President');
        }
        if (
          mapping?.exists &&
          typeof mapping.data()?.clubId === 'string' &&
          mapping.data()?.clubId !== clubId
        ) {
          throw new Error('The university already belongs to another club');
        }
        if (club.exists) {
          const data = club.data();
          if (
            data?.name !== request.clubName ||
            data?.timezone !== request.timezone ||
            data?.billingEmail !== billingEmail
          ) {
            throw new Error('The club identity already exists with different details');
          }
        }
        if (!club.exists) {
          transaction.create(clubReference, {
            name: request.clubName,
            slug: clubId,
            ...(request.universityId ? { universityId: request.universityId } : {}),
            timezone: request.timezone,
            billingEmail,
            billingEnforcementEnabled: true,
            accessState: 'pending_setup',
            paymentStanding: 'current',
            collectionMethod: 'manual',
            createdAt: now,
            updatedAt: now,
          });
          transaction.create(
            firestore.collection('billing-accounts').doc(clubId),
            {
              collectionMethod: 'manual',
              createdAt: now,
              updatedAt: now,
            },
          );
        }
        transaction.set(
          clubReference,
          {
            ...(request.universityId ? { universityId: request.universityId } : {}),
            presidentUserId: user.uid,
            updatedAt: now,
          },
          { merge: true },
        );
        transaction.set(
          userReference,
          {
            email: request.presidentEmail,
            role: 3,
            clubId,
            platformAdmin: false,
            banned: false,
            disciplinaryNotices: [],
            ...(existingUser.exists
              ? {}
              : { agreedToTerms: false, termsVersion: '' }),
            updatedAt: now,
          },
          { merge: true },
        );
        transaction.set(
          clubReference.collection('public-profiles').doc(user.uid),
          {
            displayName: displayName(request.presidentEmail),
            bio: '',
            profilePhotoUrl: '',
            role: 3,
            achievementIds: ['president'],
            selectedTitleId: 'president',
            clubId,
          },
          { merge: true },
        );
        transaction.set(
          clubReference.collection('access').doc('public'),
          {
            clubId,
            clubName: request.clubName,
            timezone: request.timezone,
            billingEnforcementEnabled: true,
            maintenanceMode: false,
            accessState: 'pending_setup',
            paymentStanding: 'current',
            collectionMethod: 'manual',
            updatedAt: now,
          },
          { merge: true },
        );
        transaction.set(
          clubReference.collection('app-settings').doc('public'),
          {
            logoUrl: '',
            primaryColor: request.primaryColor,
            accentColor: request.accentColor,
            sightingsAnonymous: true,
          },
          { merge: true },
        );
        if (mappingReference && request.universityId && request.universityName) {
          transaction.set(
            mappingReference,
            {
              universityId: request.universityId,
              universityName: request.universityName,
              clubId,
              clubName: request.clubName,
              emailEnabled: true,
              createdAt: mapping?.data()?.createdAt ?? now,
              updatedAt: now,
            },
            { merge: true },
          );
        }
      });
      profileProvisioned = true;

      const link = await auth.generatePasswordResetLink(request.presidentEmail, {
        url: `${this.dependencies.webOrigin()}/login`,
      });
      await this.dependencies.sendPasswordSetup(
        request.presidentEmail,
        request.clubName,
        link,
      );
      await firestore.collection('clubs').doc(clubId).set(
        {
          presidentInvitationSentAt: Timestamp.fromDate(this.now()),
          updatedAt: Timestamp.fromDate(this.now()),
        },
        { merge: true },
      );
      return { clubId, clubName: request.clubName, presidentUserId: user.uid };
    } catch (error) {
      if (created && !profileProvisioned) {
        await auth.deleteUser(user.uid).catch(() => undefined);
      }
      throw error;
    }
  }

  private async findOrCreateUser(
    email: string,
  ): Promise<{ readonly user: UserRecord; readonly created: boolean }> {
    try {
      return { user: await this.dependencies.auth.getUserByEmail(email), created: false };
    } catch (error) {
      if (!hasCode(error, 'auth/user-not-found')) throw error;
      try {
        return {
          user: await this.dependencies.auth.createUser({
            email,
            emailVerified: true,
            disabled: false,
          }),
          created: true,
        };
      } catch (creationError) {
        if (!hasCode(creationError, 'auth/email-already-exists')) throw creationError;
        return {
          user: await this.dependencies.auth.getUserByEmail(email),
          created: false,
        };
      }
    }
  }
}

export const clubIdForUniversity = (universityId: string): string => {
  if (!/^\d{1,20}$/.test(universityId)) {
    throw new Error('Expected a College Scorecard university ID');
  }
  return `club-${universityId}`;
};

const displayName = (email: string): string =>
  (email.split('@')[0]?.trim() || 'Campus Cats President').slice(0, 60);

const hasCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === code;
