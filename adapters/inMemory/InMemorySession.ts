import { Role, User, parseUser } from '../../core/domain';
import {
  BannedAccountError,
  ExternalSignInResult,
  SessionPort,
} from '../../core/ports';

type Operation =
  | 'currentUser'
  | 'signInWithEmail'
  | 'createAccount'
  | 'requestPasswordReset'
  | 'signInWithSaml'
  | 'signOut'
  | 'registerPushToken'
  | 'acceptTerms';

interface EmailAccount {
  readonly password: string;
  readonly user: User;
}

export class InMemorySession implements SessionPort {
  readonly operations: string[] = [];
  readonly #accounts = new Map<string, EmailAccount>();
  readonly #samlResults: ExternalSignInResult[] = [];
  readonly #failures = new Map<Operation, Error>();
  readonly #observers = new Set<(user: User | undefined) => void>();
  #current: User | undefined;

  constructor(current?: User) {
    this.#current = current;
  }

  addEmailAccount(email: string, password: string, user: User): void {
    this.#accounts.set(email.toLowerCase(), { password, user });
  }

  queueSamlResult(result: ExternalSignInResult): void {
    this.#samlResults.push(result);
  }

  failNext(operation: Operation, error: Error): void {
    this.#failures.set(operation, error);
  }

  async currentUser(): Promise<User | undefined> {
    this.maybeFail('currentUser');
    if (this.#current) this.requireActive(this.#current);
    return this.#current;
  }

  observeCurrentUser(onChange: (user: User | undefined) => void): () => void {
    this.#observers.add(onChange);
    onChange(this.isBanned(this.#current) ? undefined : this.#current);
    return () => this.#observers.delete(onChange);
  }

  setCurrentUser(user: User | undefined): void {
    this.#current = user;
    this.notifyObservers();
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    this.maybeFail('signInWithEmail');
    const account = this.#accounts.get(email.toLowerCase());
    if (!account || account.password !== password) {
      throw new Error('Invalid credentials');
    }
    this.requireActive(account.user);
    this.#current = account.user;
    this.notifyObservers();
    this.operations.push(`email-sign-in:${account.user.id}`);
    return account.user;
  }

  async createAccount(email: string, password: string): Promise<User> {
    this.maybeFail('createAccount');
    if (this.#accounts.has(email.toLowerCase())) {
      throw new Error('Account already exists');
    }
    const user = parseUser({
      id: `created-${email.toLowerCase()}`,
      email,
      role: Role.Member,
      agreedToTerms: false,
      termsVersion: '',
    });
    this.addEmailAccount(email, password, user);
    this.#current = user;
    this.notifyObservers();
    this.operations.push(`create-account:${user.id}`);
    return user;
  }

  async requestPasswordReset(email: string): Promise<void> {
    this.maybeFail('requestPasswordReset');
    this.operations.push(`password-reset:${email.toLowerCase()}`);
  }

  async signInWithSaml(): Promise<ExternalSignInResult> {
    this.maybeFail('signInWithSaml');
    const result = this.#samlResults.shift();
    if (!result) throw new Error('No deterministic SAML result remains');
    if (result.status === 'authenticated') {
      this.requireActive(result.user);
      this.#current = result.user;
      this.notifyObservers();
    }
    this.operations.push(`saml:${result.status}`);
    return result;
  }

  async signOut(): Promise<void> {
    this.maybeFail('signOut');
    this.#current = undefined;
    this.notifyObservers();
    this.operations.push('sign-out');
  }

  async registerPushToken(token: string): Promise<void> {
    this.maybeFail('registerPushToken');
    if (!this.#current) throw new Error('Not authenticated');
    this.operations.push(`register-token:${token}`);
  }

  async acceptTerms(version: string): Promise<void> {
    this.maybeFail('acceptTerms');
    if (!this.#current) throw new Error('Not authenticated');
    const accepted = parseUser({
      ...this.#current,
      agreedToTerms: true,
      termsVersion: version,
    });
    this.#current = accepted;
    for (const [email, account] of this.#accounts) {
      if (account.user.id === accepted.id) {
        this.#accounts.set(email, { ...account, user: accepted });
      }
    }
    this.operations.push(`accept-terms:${version}`);
    this.notifyObservers();
  }

  private maybeFail(operation: Operation): void {
    const failure = this.#failures.get(operation);
    if (failure) {
      this.#failures.delete(operation);
      throw failure;
    }
  }

  private notifyObservers(): void {
    const current = this.isBanned(this.#current) ? undefined : this.#current;
    for (const observer of this.#observers) observer(current);
  }

  private isBanned(user: User | undefined): boolean {
    return Boolean(user && 'banned' in user && user.banned === true);
  }

  private requireActive(user: User): void {
    if (this.isBanned(user)) throw new BannedAccountError();
  }
}
