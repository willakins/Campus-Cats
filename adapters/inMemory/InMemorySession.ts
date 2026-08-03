import { Role, User, parseUser } from '../../core/domain';
import { ExternalSignInResult, SessionPort } from '../../core/ports';

type Operation =
  | 'currentUser'
  | 'signInWithEmail'
  | 'createAccount'
  | 'signInWithSaml'
  | 'signOut'
  | 'registerPushToken';

interface EmailAccount {
  readonly password: string;
  readonly user: User;
}

export class InMemorySession implements SessionPort {
  readonly operations: string[] = [];
  readonly #accounts = new Map<string, EmailAccount>();
  readonly #samlResults: ExternalSignInResult[] = [];
  readonly #failures = new Map<Operation, Error>();
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
    return this.#current;
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    this.maybeFail('signInWithEmail');
    const account = this.#accounts.get(email.toLowerCase());
    if (!account || account.password !== password) {
      throw new Error('Invalid credentials');
    }
    this.#current = account.user;
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
    });
    this.addEmailAccount(email, password, user);
    this.#current = user;
    this.operations.push(`create-account:${user.id}`);
    return user;
  }

  async signInWithSaml(): Promise<ExternalSignInResult> {
    this.maybeFail('signInWithSaml');
    const result = this.#samlResults.shift();
    if (!result) throw new Error('No deterministic SAML result remains');
    if (result.status === 'authenticated') this.#current = result.user;
    this.operations.push(`saml:${result.status}`);
    return result;
  }

  async signOut(): Promise<void> {
    this.maybeFail('signOut');
    this.#current = undefined;
    this.operations.push('sign-out');
  }

  async registerPushToken(token: string): Promise<void> {
    this.maybeFail('registerPushToken');
    if (!this.#current) throw new Error('Not authenticated');
    this.operations.push(`register-token:${token}`);
  }

  private maybeFail(operation: Operation): void {
    const failure = this.#failures.get(operation);
    if (failure) {
      this.#failures.delete(operation);
      throw failure;
    }
  }
}
