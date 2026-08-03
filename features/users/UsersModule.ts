import {
  COLLECTIONS,
  FirestoreCodec,
  Outcome,
  Role,
  User,
  canManageFeature,
  canManageUser,
  failure,
  parseUser,
  success,
} from '../../core/domain';
import { CallableEffects, DocumentStore } from '../../core/ports';

interface UsersDependencies {
  readonly documents: DocumentStore;
  readonly effects: CallableEffects;
  readonly codecs: { readonly user: FirestoreCodec<User> };
}

export class UsersModule {
  constructor(private readonly dependencies: UsersDependencies) {}

  async list(actor: User | undefined): Promise<Outcome<readonly User[]>> {
    const denied = adminDenied(actor);
    if (denied) return denied;
    const administrator = actor as User;
    try {
      const documents = await this.dependencies.documents.list(COLLECTIONS.users);
      return success(
        documents
          .map(({ id, data }) => this.dependencies.codecs.user.decode(id, data))
          .filter(({ id }) => id !== administrator.id),
      );
    } catch {
      return failure('dependency_failure', 'Could not load users');
    }
  }

  async promote(actor: User | undefined, id: string): Promise<Outcome<User>> {
    return this.changeRole(actor, id, 1);
  }

  async demote(actor: User | undefined, id: string): Promise<Outcome<User>> {
    return this.changeRole(actor, id, -1);
  }

  async remove(actor: User | undefined, id: string): Promise<Outcome<void>> {
    const denied = adminDenied(actor);
    if (denied) return denied;
    const administrator = actor as User;
    const target = await this.get(id);
    if (!target.ok) return target;
    if (!canManageUser(administrator, target.value)) {
      return failure(
        'forbidden',
        'You cannot manage yourself or a user with an equal or higher role',
      );
    }
    try {
      await this.dependencies.effects.removeUser(id);
      return success(undefined);
    } catch {
      return failure('dependency_failure', 'Could not remove the user');
    }
  }

  private async changeRole(
    actor: User | undefined,
    id: string,
    change: -1 | 1,
  ): Promise<Outcome<User>> {
    const denied = adminDenied(actor);
    if (denied) return denied;
    const administrator = actor as User;
    const target = await this.get(id);
    if (!target.ok) return target;
    if (!canManageUser(administrator, target.value)) {
      return failure(
        'forbidden',
        'You cannot manage yourself or a user with an equal or higher role',
      );
    }
    const role = Math.max(
      Role.Member,
      Math.min(Role.SuperAdmin, target.value.role + change),
    ) as Role;
    if (role === target.value.role) {
      return failure('conflict', 'The user is already at that role boundary');
    }
    const updated = parseUser({ ...target.value, role });
    try {
      await this.dependencies.effects.updateUserRole(id, role);
      return success(updated);
    } catch {
      return failure('dependency_failure', 'Could not update the user role');
    }
  }

  private async get(id: string): Promise<Outcome<User>> {
    try {
      const document = await this.dependencies.documents.get(COLLECTIONS.users, id);
      return document
        ? success(this.dependencies.codecs.user.decode(document.id, document.data))
        : failure('not_found', 'User not found');
    } catch {
      return failure('dependency_failure', 'Could not load the user');
    }
  }
}

function adminDenied(actor: User | undefined): Outcome<never> | undefined {
  if (!actor) return failure('unauthenticated', 'Sign in to manage users');
  if (!canManageFeature(actor.role)) {
    return failure('forbidden', 'Only administrators may manage users');
  }
  return undefined;
}
