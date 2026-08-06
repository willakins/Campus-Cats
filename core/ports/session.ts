import { User } from '../domain';

export class BannedAccountError extends Error {
  constructor() {
    super('This account has been banned from Campus Cats.');
    this.name = 'BannedAccountError';
  }
}

export type ExternalSignInResult =
  | { readonly status: 'authenticated'; readonly user: User }
  | { readonly status: 'cancelled' };

export interface SessionPort {
  currentUser(): Promise<User | undefined>;
  observeCurrentUser(
    onChange: (user: User | undefined) => void,
    onError?: (error: unknown) => void,
  ): () => void;
  signInWithEmail(email: string, password: string): Promise<User>;
  createAccount(email: string, password: string): Promise<User>;
  requestPasswordReset(email: string): Promise<void>;
  signInWithSaml(): Promise<ExternalSignInResult>;
  signOut(): Promise<void>;
  registerPushToken(token: string): Promise<void>;
}
