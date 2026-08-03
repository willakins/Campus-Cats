import {
  Auth,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { Firestore, doc, getDoc, setDoc } from 'firebase/firestore';

import { Role, User, parseUser } from '../../core/domain';
import { ExternalSignInResult, SessionPort } from '../../core/ports';
import { SamlCredentialProvider } from './ExpoSamlCredentialProvider';

export class FirebaseSession implements SessionPort {
  constructor(
    private readonly auth: Auth,
    private readonly firestore: Firestore,
    private readonly saml: SamlCredentialProvider,
  ) {}

  async currentUser(): Promise<User | undefined> {
    return this.auth.currentUser
      ? this.ensureProfile(this.auth.currentUser)
      : undefined;
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    return this.ensureProfile(credential.user);
  }

  async createAccount(email: string, password: string): Promise<User> {
    const credential = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password,
    );
    return this.ensureProfile(credential.user);
  }

  async signInWithSaml(): Promise<ExternalSignInResult> {
    const credential = await this.saml.credential();
    if (!credential) return { status: 'cancelled' };
    const result = await signInWithCredential(this.auth, credential);
    return { status: 'authenticated', user: await this.ensureProfile(result.user) };
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

  private async ensureProfile(user: FirebaseUser): Promise<User> {
    if (!user.email) throw new Error('Authenticated account has no email');
    const reference = doc(this.firestore, 'users', user.uid);
    const snapshot = await getDoc(reference);
    if (!snapshot.exists()) {
      await setDoc(reference, { email: user.email, role: Role.Member });
      return parseUser({ id: user.uid, email: user.email, role: Role.Member });
    }
    return parseUser({ id: snapshot.id, ...snapshot.data() });
  }
}
