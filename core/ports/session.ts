import { User } from '../domain';

export type ExternalSignInResult =
  | { readonly status: 'authenticated'; readonly user: User }
  | { readonly status: 'cancelled' };

export interface SessionPort {
  currentUser(): Promise<User | undefined>;
  signInWithEmail(email: string, password: string): Promise<User>;
  createAccount(email: string, password: string): Promise<User>;
  signInWithSaml(): Promise<ExternalSignInResult>;
  signOut(): Promise<void>;
  registerPushToken(token: string): Promise<void>;
}
