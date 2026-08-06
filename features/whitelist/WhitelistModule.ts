import {
  COLLECTIONS,
  PersistenceCodec,
  Outcome,
  User,
  WhitelistApplication,
  canManageFeature,
  failure,
  parseWhitelistApplication,
  success,
} from '../../core/domain';
import {
  ApplicationEffects,
  DocumentStore,
  PasswordGenerator,
  WhitelistSubmissionPort,
} from '../../core/ports';

export interface WhitelistDraft {
  readonly name: string;
  readonly graduationYear: string;
  readonly email: string;
  readonly codeWord: string;
}

interface WhitelistDependencies {
  readonly documents: DocumentStore;
  readonly effects: ApplicationEffects;
  readonly passwords: PasswordGenerator;
  readonly submissions: WhitelistSubmissionPort;
  readonly codecs: {
    readonly whitelist: PersistenceCodec<WhitelistApplication>;
  };
}

export class WhitelistModule {
  constructor(private readonly dependencies: WhitelistDependencies) {}

  async submit(draft: WhitelistDraft): Promise<Outcome<WhitelistApplication>> {
    let validatedDraft: WhitelistApplication;
    try {
      validatedDraft = parseWhitelistApplication({ id: 'validation', ...draft });
    } catch {
      return failure(
        'validation',
        'Name, graduation year, and a valid email are required',
      );
    }
    try {
      const { id: _validationId, ...validatedFields } = validatedDraft;
      const submitted = await this.dependencies.submissions.submit(validatedFields);
      if (submitted.status === 'conflict') {
        return failure(
          'conflict',
          'An application has already been submitted for this email',
        );
      }
      return success(
        parseWhitelistApplication({ id: submitted.id, ...validatedFields }),
      );
    } catch {
      return failure('dependency_failure', 'Could not submit the application');
    }
  }

  async list(
    actor: User | undefined,
  ): Promise<Outcome<readonly WhitelistApplication[]>> {
    const denied = adminDenied(actor);
    if (denied) return denied;
    try {
      const documents = await this.dependencies.documents.list(COLLECTIONS.whitelist);
      return success(
        documents.map(({ id, data }) =>
          this.dependencies.codecs.whitelist.decode(id, data),
        ),
      );
    } catch {
      return failure('dependency_failure', 'Could not load whitelist applications');
    }
  }

  async deny(actor: User | undefined, id: string): Promise<Outcome<void>> {
    const denied = adminDenied(actor);
    if (denied) return denied;
    const application = await this.get(id);
    if (!application.ok) return application;
    try {
      await this.dependencies.documents.remove(COLLECTIONS.whitelist, id);
      return success(undefined);
    } catch {
      return failure('dependency_failure', 'Could not deny the application');
    }
  }

  async accept(actor: User | undefined, id: string): Promise<Outcome<void>> {
    const denied = adminDenied(actor);
    if (denied) return denied;
    const application = await this.get(id);
    if (!application.ok) return application;

    let password: string;
    let userId: string;
    try {
      password = this.dependencies.passwords.generate(10);
      userId = await this.dependencies.effects.provisionWhitelistUser({
        email: application.value.email,
        password,
      });
    } catch {
      return failure('dependency_failure', 'Could not provision the whitelist user');
    }

    try {
      await this.dependencies.effects.emailWhitelistCredentials({
        email: application.value.email,
        password,
      });
    } catch {
      try {
        await this.dependencies.effects.removeProvisionedUser(userId);
        return failure(
          'dependency_failure',
          'Could not email credentials; the provisioned user was removed',
        );
      } catch {
        return failure(
          'partial_failure',
          'Could not email credentials or remove the provisioned user',
        );
      }
    }

    try {
      await this.dependencies.documents.remove(COLLECTIONS.whitelist, id);
      return success(undefined);
    } catch {
      return failure(
        'partial_failure',
        'User was provisioned and emailed, but the application remains',
      );
    }
  }

  private async get(id: string): Promise<Outcome<WhitelistApplication>> {
    try {
      const document = await this.dependencies.documents.get(COLLECTIONS.whitelist, id);
      return document
        ? success(
            this.dependencies.codecs.whitelist.decode(document.id, document.data),
          )
        : failure('not_found', 'Whitelist application not found');
    } catch {
      return failure('dependency_failure', 'Could not load the application');
    }
  }
}

function adminDenied(actor: User | undefined): Outcome<never> | undefined {
  if (!actor) return failure('unauthenticated', 'Sign in to manage applications');
  if (!canManageFeature(actor.role)) {
    return failure('forbidden', 'Only officers may manage applications');
  }
  return undefined;
}
