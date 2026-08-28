import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

import { FirebaseSession } from './FirebaseSession';

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  deleteUser: jest.fn(),
  onAuthStateChanged: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signInWithCredential: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ path: 'users/member-1' })),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
  setDoc: jest.fn(),
}));

const mockedSendPasswordResetEmail = jest.mocked(sendPasswordResetEmail);
const mockedSignInWithEmailAndPassword = jest.mocked(signInWithEmailAndPassword);
const mockedGetDoc = jest.mocked(getDoc);
const mockedOnAuthStateChanged = jest.mocked(onAuthStateChanged);
const mockedOnSnapshot = jest.mocked(onSnapshot);
const mockedSetDoc = jest.mocked(setDoc);

const buildSession = (
  auth: ConstructorParameters<typeof FirebaseSession>[0] =
    {} as ConstructorParameters<typeof FirebaseSession>[0],
) =>
  new FirebaseSession(
    auth,
    {} as ConstructorParameters<typeof FirebaseSession>[1],
    { credential: jest.fn() },
  );

describe('FirebaseSession authenticated profiles', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the Firebase Auth email when profile casing differs', async () => {
    mockedGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'member-1',
      data: () => ({
        email: 'Member@Example.com',
        role: 4,
        clubId: 'campus-cats',
        platformAdmin: true,
      }),
    } as Awaited<ReturnType<typeof getDoc>>);

    const user = await buildSession({
      currentUser: {
        uid: 'member-1',
        email: 'member@example.com',
      },
    } as ConstructorParameters<typeof FirebaseSession>[0]).currentUser();

    expect(user).toMatchObject({
      id: 'member-1',
      email: 'member@example.com',
      role: 4,
      clubId: 'campus-cats',
      platformAdmin: true,
      agreedToTerms: false,
      termsVersion: '',
    });
    expect(mockedSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      { agreedToTerms: false, termsVersion: '' },
      { merge: true },
    );
  });

  it('does not publish an in-flight profile after the observer is disposed', async () => {
    let authChanged: ((user: unknown) => void) | undefined;
    let profileChanged: ((snapshot: unknown) => void) | undefined;
    let resolveProfile: ((snapshot: Awaited<ReturnType<typeof getDoc>>) => void) | undefined;
    mockedOnAuthStateChanged.mockImplementation((
      _auth,
      onChange,
    ) => {
      authChanged = onChange as (user: unknown) => void;
      return jest.fn();
    });
    mockedOnSnapshot.mockImplementation((
      _reference,
      onChange,
    ) => {
      profileChanged = onChange as (snapshot: unknown) => void;
      return jest.fn();
    });
    mockedGetDoc.mockImplementation(
      () => new Promise((resolve) => {
        resolveProfile = resolve;
      }),
    );
    const observer = jest.fn();
    const stop = buildSession().observeCurrentUser(observer);

    authChanged?.({ uid: 'member-1', email: 'member@example.com' });
    profileChanged?.({ exists: () => false });
    stop();
    resolveProfile?.({
      exists: () => true,
      id: 'member-1',
      data: () => ({ role: 0, clubId: 'campus-cats' }),
    } as Awaited<ReturnType<typeof getDoc>>);
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(observer).not.toHaveBeenCalled();
  });
});

describe('FirebaseSession password reset', () => {
  beforeEach(() => jest.clearAllMocks());

  it('asks Firebase to deliver reset instructions', async () => {
    mockedSendPasswordResetEmail.mockResolvedValue(undefined);

    await expect(
      buildSession().requestPasswordReset('member@example.com'),
    ).resolves.toBeUndefined();
    expect(mockedSendPasswordResetEmail).toHaveBeenCalledWith(
      expect.anything(),
      'member@example.com',
    );
  });

  it('does not reveal whether the requested account exists', async () => {
    mockedSendPasswordResetEmail.mockRejectedValue({ code: 'auth/user-not-found' });

    await expect(
      buildSession().requestPasswordReset('unknown@example.com'),
    ).resolves.toBeUndefined();
  });

  it('preserves actionable Firebase delivery failures', async () => {
    const failure = { code: 'auth/invalid-api-key' };
    mockedSendPasswordResetEmail.mockRejectedValue(failure);

    await expect(
      buildSession().requestPasswordReset('member@example.com'),
    ).rejects.toBe(failure);
  });
});

describe('FirebaseSession terms agreement', () => {
  beforeEach(() => jest.clearAllMocks());

  it('records the agreement version with a server timestamp', async () => {
    const session = buildSession({
      currentUser: { uid: 'member-1', email: 'member@example.com' },
    } as ConstructorParameters<typeof FirebaseSession>[0]);

    await session.acceptTerms('2026-08-28');

    expect(serverTimestamp).toHaveBeenCalledTimes(1);
    expect(mockedSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      {
        agreedToTerms: true,
        termsVersion: '2026-08-28',
        termsAgreedAt: 'server-timestamp',
      },
      { merge: true },
    );
  });
});

describe('FirebaseSession banned accounts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('maps Firebase-disabled accounts to the app ban error', async () => {
    mockedSignInWithEmailAndPassword.mockRejectedValue({
      code: 'auth/user-disabled',
    });

    await expect(
      buildSession().signInWithEmail('banned@example.com', 'password'),
    ).rejects.toThrow('This account has been banned from Campus Cats.');
  });
});
