import {
  Auth,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { Firestore, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';

import { ManagedUser, Role, User, parseManagedUser } from '../../core/domain';
import {
  BannedAccountError,
  ExternalSignInResult,
  SessionPort,
} from '../../core/ports';
import { SamlCredentialProvider } from './ExpoSamlCredentialProvider';

export class FirebaseSession implements SessionPort {
  constructor(
    private readonly auth: Auth,
    private readonly firestore: Firestore,
    private readonly saml: SamlCredentialProvider,
  ) {}

  async currentUser(): Promise<User | undefined> {
    return this.auth.currentUser
      ? this.ensureActiveProfile(this.auth.currentUser)
      : undefined;
  }

  observeCurrentUser(
    onChange: (user: User | undefined) => void,
    onError: (error: unknown) => void = () => undefined,
  ): () => void {
    let unsubscribeProfile: () => void = () => undefined;
    const unsubscribeAuth = onAuthStateChanged(
      this.auth,
      (authenticated) => {
        unsubscribeProfile();
        if (!authenticated) {
          onChange(undefined);
          return;
        }
        const reference = doc(this.firestore, 'users', authenticated.uid);
        unsubscribeProfile = onSnapshot(
          reference,
          (snapshot) => {
            if (!snapshot.exists()) {
              void this.ensureActiveProfile(authenticated).then(onChange).catch(onError);
              return;
            }
            try {
              const profile = parseManagedUser({
                id: snapshot.id,
                ...snapshot.data(),
              });
              if (profile.banned) {
                onChange(undefined);
                void signOut(this.auth).catch(onError);
                return;
              }
              onChange(profile);
            } catch (error) {
              onError(error);
            }
          },
          onError,
        );
      },
      onError,
    );
    return () => {
      unsubscribeProfile();
      unsubscribeAuth();
    };
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    try {
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      return this.ensureActiveProfile(credential.user);
    } catch (error) {
      if (isDisabledAccountError(error)) throw new BannedAccountError();
      throw error;
    }
  }

  async createAccount(email: string, password: string): Promise<User> {
    const credential = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password,
    );
    return this.ensureActiveProfile(credential.user);
  }

  async requestPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'auth/user-not-found'
      ) {
        return;
      }
      throw error;
    }
  }

  async signInWithSaml(): Promise<ExternalSignInResult> {
    const credential = await this.saml.credential();
    if (!credential) return { status: 'cancelled' };
    try {
      const result = await signInWithCredential(this.auth, credential);
      return {
        status: 'authenticated',
        user: await this.ensureActiveProfile(result.user),
      };
    } catch (error) {
      if (isDisabledAccountError(error)) throw new BannedAccountError();
      throw error;
    }
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }

  async registerPushToken(token: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    await setDoc(doc(this.firestore, 'users', user.uid), { expoPushToken: token }, {
      merge: true,
    });
  }

  private async ensureProfile(user: FirebaseUser): Promise<ManagedUser> {
    if (!user.email) throw new Error('Authenticated account has no email');
    const reference = doc(this.firestore, 'users', user.uid);
    const snapshot = await getDoc(reference);
    if (!snapshot.exists()) {
      await setDoc(reference, { email: user.email, role: Role.Member });
      return parseManagedUser({
        id: user.uid,
        email: user.email,
        role: Role.Member,
      });
    }
    return parseManagedUser({ id: snapshot.id, ...snapshot.data() });
  }

  private async ensureActiveProfile(user: FirebaseUser): Promise<ManagedUser> {
    const profile = await this.ensureProfile(user);
    if (profile.banned) {
      await signOut(this.auth);
      throw new BannedAccountError();
    }
    return profile;
  }
}

function isDisabledAccountError(error: unknown): boolean {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'auth/user-disabled';
}
