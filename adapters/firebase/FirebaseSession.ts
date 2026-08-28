import {
  Auth,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  deleteUser,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import {
  DocumentData,
  DocumentReference,
  Firestore,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { ManagedUser, User, parseManagedUser } from '../../core/domain';
import {
  BannedAccountError,
  ExternalSignInResult,
  SessionPort,
  UnprovisionedAccountError,
} from '../../core/ports';
import { SamlCredentialProvider } from './ExpoSamlCredentialProvider';
import { FirebaseTenantScope } from './FirebaseTenantScope';

export class FirebaseSession implements SessionPort {
  constructor(
    private readonly auth: Auth,
    private readonly firestore: Firestore,
    private readonly saml: SamlCredentialProvider,
    private readonly tenantScope?: FirebaseTenantScope,
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
    let active = true;
    let revision = 0;
    let unsubscribeProfile: () => void = () => undefined;
    const unsubscribeAuth = onAuthStateChanged(
      this.auth,
      (authenticated) => {
        if (!active) return;
        const currentRevision = ++revision;
        unsubscribeProfile();
        if (!authenticated) {
          this.tenantScope?.clearAuthenticatedClub();
          onChange(undefined);
          return;
        }
        const reference = doc(this.firestore, 'users', authenticated.uid);
        unsubscribeProfile = onSnapshot(
          reference,
          async (snapshot) => {
            if (!active || currentRevision !== revision) return;
            if (!snapshot.exists()) {
              void this.ensureActiveProfile(authenticated)
                .then((profile) => {
                  if (active && currentRevision === revision) onChange(profile);
                })
                .catch((error) => {
                  if (active && currentRevision === revision) onError(error);
                });
              return;
            }
            try {
              const data = await this.ensureTermsAgreementFlag(
                reference,
                snapshot.data(),
              );
              const profile = parseAuthenticatedProfile(
                authenticated,
                snapshot.id,
                data,
              );
              if (profile.banned) {
                this.tenantScope?.clearAuthenticatedClub();
                onChange(undefined);
                void signOut(this.auth).catch((error) => {
                  if (active && currentRevision === revision) onError(error);
                });
                return;
              }
              this.tenantScope?.setAuthenticatedClub(profile.clubId);
              onChange(profile);
            } catch (error) {
              onError(error);
            }
          },
          (error) => {
            if (active && currentRevision === revision) onError(error);
          },
        );
      },
      (error) => {
        if (active) onError(error);
      },
    );
    return () => {
      active = false;
      revision += 1;
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
    const profile = await getDoc(
      doc(this.firestore, 'users', credential.user.uid),
    );
    if (!profile.exists()) {
      await deleteUser(credential.user).catch(() => undefined);
      throw new UnprovisionedAccountError();
    }
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
    this.tenantScope?.clearAuthenticatedClub();
  }

  async registerPushToken(token: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    await setDoc(doc(this.firestore, 'users', user.uid), { expoPushToken: token }, {
      merge: true,
    });
  }

  async acceptTerms(version: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    await setDoc(
      doc(this.firestore, 'users', user.uid),
      {
        agreedToTerms: true,
        termsVersion: version,
        termsAgreedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  private async ensureProfile(user: FirebaseUser): Promise<ManagedUser> {
    if (!user.email) throw new Error('Authenticated account has no email');
    const reference = doc(this.firestore, 'users', user.uid);
    const snapshot = await getDoc(reference);
    if (!snapshot.exists()) {
      await signOut(this.auth);
      throw new UnprovisionedAccountError();
    }
    const data = await this.ensureTermsAgreementFlag(
      reference,
      snapshot.data(),
    );
    const profile = parseAuthenticatedProfile(
      user,
      snapshot.id,
      data,
    );
    this.tenantScope?.setAuthenticatedClub(profile.clubId);
    return profile;
  }

  private async ensureActiveProfile(user: FirebaseUser): Promise<ManagedUser> {
    const profile = await this.ensureProfile(user);
    if (profile.banned) {
      await signOut(this.auth);
      throw new BannedAccountError();
    }
    return profile;
  }

  private async ensureTermsAgreementFlag(
    reference: DocumentReference<DocumentData>,
    data: DocumentData,
  ): Promise<DocumentData> {
    if (
      typeof data.agreedToTerms === 'boolean' &&
      typeof data.termsVersion === 'string'
    ) {
      return data;
    }
    await setDoc(
      reference,
      { agreedToTerms: false, termsVersion: '' },
      { merge: true },
    );
    return { ...data, agreedToTerms: false, termsVersion: '' };
  }
}

function parseAuthenticatedProfile(
  user: FirebaseUser,
  id: string,
  data: Record<string, unknown>,
): ManagedUser {
  if (!user.email) throw new Error('Authenticated account has no email');
  return parseManagedUser({ id, ...data, email: user.email });
}

function isDisabledAccountError(error: unknown): boolean {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'auth/user-disabled';
}
