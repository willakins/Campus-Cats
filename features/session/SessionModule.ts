import { z } from 'zod';

import { Outcome, User, failure, success } from '../../core/domain';
import {
  BannedAccountError,
  ExternalSignInResult,
  SessionPort,
  UnprovisionedAccountError,
} from '../../core/ports';

interface SessionDependencies {
  readonly session: SessionPort;
}

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const emailSchema = z.string().trim().email();
const termsVersionSchema = z.string().trim().min(1).max(40);

export class SessionModule {
  constructor(private readonly dependencies: SessionDependencies) {}

  async restore(): Promise<Outcome<User | undefined>> {
    try {
      return success(await this.dependencies.session.currentUser());
    } catch {
      return failure('dependency_failure', 'Could not restore the current session');
    }
  }

  observeCurrentUser(onChange: (user: User | undefined) => void): () => void {
    return this.dependencies.session.observeCurrentUser(onChange);
  }

  async signInWithEmail(email: string, password: string): Promise<Outcome<User>> {
    if (!credentialsSchema.safeParse({ email, password }).success) {
      return failure('validation', 'Enter a valid email and password');
    }
    try {
      return success(await this.dependencies.session.signInWithEmail(email, password));
    } catch (error) {
      if (
        error instanceof BannedAccountError ||
        error instanceof UnprovisionedAccountError
      ) {
        return failure('forbidden', error.message);
      }
      return failure('authentication_failed', 'Email sign-in failed');
    }
  }

  async createAccount(email: string, password: string): Promise<Outcome<User>> {
    if (!credentialsSchema.safeParse({ email, password }).success) {
      return failure('validation', 'Enter a valid email and password');
    }
    try {
      return success(await this.dependencies.session.createAccount(email, password));
    } catch {
      return failure('authentication_failed', 'Could not create the account');
    }
  }

  async requestPasswordReset(email: string): Promise<Outcome<void>> {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      return failure('validation', 'Enter the email address for your account.');
    }
    try {
      await this.dependencies.session.requestPasswordReset(parsed.data.toLowerCase());
      return success(undefined);
    } catch {
      return failure(
        'dependency_failure',
        'Could not send password-reset instructions. Please try again.',
      );
    }
  }

  async signInWithSaml(): Promise<Outcome<ExternalSignInResult>> {
    try {
      return success(await this.dependencies.session.signInWithSaml());
    } catch (error) {
      if (
        error instanceof BannedAccountError ||
        error instanceof UnprovisionedAccountError
      ) {
        return failure('forbidden', error.message);
      }
      return failure('dependency_failure', 'SSO sign-in could not be completed');
    }
  }

  async signOut(): Promise<Outcome<void>> {
    try {
      await this.dependencies.session.signOut();
      return success(undefined);
    } catch {
      return failure('dependency_failure', 'Could not sign out');
    }
  }

  async registerPushToken(token: string): Promise<Outcome<void>> {
    if (!token.trim()) return failure('validation', 'Push token cannot be empty');
    try {
      await this.dependencies.session.registerPushToken(token);
      return success(undefined);
    } catch {
      return failure('dependency_failure', 'Could not register the push token');
    }
  }

  async acceptTerms(version: string): Promise<Outcome<void>> {
    const parsed = termsVersionSchema.safeParse(version);
    if (!parsed.success) {
      return failure('validation', 'Terms version is required');
    }
    try {
      await this.dependencies.session.acceptTerms(parsed.data);
      return success(undefined);
    } catch {
      return failure(
        'dependency_failure',
        'Could not record your agreement. Please try again.',
      );
    }
  }
}
