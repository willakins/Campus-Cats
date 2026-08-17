import type { ExternalSignInResult, SessionPort } from '../../core/ports';
import type { User } from '../../core/domain';

export class DevelopmentSession implements SessionPort {
  constructor(private readonly developmentSession: SessionPort) {}

  async currentUser(): Promise<User | undefined> {
    return this.developmentSession.currentUser();
  }

  observeCurrentUser(
    onChange: (user: User | undefined) => void,
    onError?: (error: unknown) => void,
  ): () => void {
    return this.developmentSession.observeCurrentUser(onChange, onError);
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    return this.developmentSession.signInWithEmail(email, password);
  }

  async createAccount(email: string, password: string): Promise<User> {
    return this.developmentSession.createAccount(email, password);
  }

  async requestPasswordReset(_email: string): Promise<void> {
    throw new Error('Password-reset emails are disabled in development');
  }

  async signInWithSaml(): Promise<ExternalSignInResult> {
    return this.developmentSession.signInWithSaml();
  }

  async signOut(): Promise<void> {
    return this.developmentSession.signOut();
  }

  async registerPushToken(token: string): Promise<void> {
    return this.developmentSession.registerPushToken(token);
  }
}

export const createSessionGateway = (
  firebaseSession: SessionPort,
  appEnvironment: string | undefined = process.env.EXPO_PUBLIC_APP_ENV,
): SessionPort => appEnvironment === 'development'
  ? new DevelopmentSession(firebaseSession)
  : firebaseSession;
