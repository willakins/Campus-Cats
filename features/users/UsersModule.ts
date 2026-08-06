import {
  COLLECTIONS,
  FirestoreCodec,
  ManagedUser,
  Outcome,
  Role,
  User,
  canChangeUserRole,
  canDisciplineUser,
  canManageFeature,
  canManageUser,
  canTransferPresidency,
  failure,
  parseManagedUser,
  success,
} from '../../core/domain';
import { CallableEffects, DocumentStore } from '../../core/ports';

interface UsersDependencies {
  readonly documents: DocumentStore;
  readonly effects: CallableEffects;
  readonly codecs: { readonly user: FirestoreCodec<ManagedUser> };
}

export class UsersModule {
  constructor(private readonly dependencies: UsersDependencies) {}

  async list(actor: User | undefined): Promise<Outcome<readonly ManagedUser[]>> {
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

  async promote(actor: User | undefined, id: string): Promise<Outcome<ManagedUser>> {
    return this.changeRole(actor, id, 1);
  }

  async demote(actor: User | undefined, id: string): Promise<Outcome<ManagedUser>> {
    return this.changeRole(actor, id, -1);
  }

  async transferPresidency(
    actor: User | undefined,
    id: string,
    hasPresident: boolean,
  ): Promise<Outcome<void>> {
    const denied = adminDenied(actor);
    if (denied) return denied;
    const administrator = actor as User;
    const target = await this.get(id);
    if (!target.ok) return target;
    if (target.value.banned) {
      return failure(
        'conflict',
        'Unban this account before transferring the presidency',
      );
    }
    if (!canTransferPresidency(administrator, target.value, hasPresident)) {
      return failure(
        'forbidden',
        'Only a Vice-President can be selected in a valid presidential succession',
      );
    }
    try {
      await this.dependencies.effects.transferPresidency(id);
      return success(undefined);
    } catch {
      return failure('dependency_failure', 'Could not transfer the presidency');
    }
  }

  async addDisciplinaryNotice(
    actor: User | undefined,
    id: string,
    message: string,
  ): Promise<Outcome<void>> {
    const denied = adminDenied(actor);
    if (denied) return denied;
    const trimmedMessage = message.trim();
    if (!trimmedMessage || trimmedMessage.length > 500) {
      return failure(
        'validation',
        'A disciplinary notice must be between 1 and 500 characters',
      );
    }
    const target = await this.get(id);
    if (!target.ok) return target;
    if (!canDisciplineUser(actor as User, target.value)) {
      return failure(
        'forbidden',
        'Only member accounts can receive disciplinary notices',
      );
    }
    try {
      await this.dependencies.effects.addDisciplinaryNotice(id, trimmedMessage);
      return success(undefined);
    } catch {
      return failure('dependency_failure', 'Could not add the disciplinary notice');
    }
  }

  async setBanned(
    actor: User | undefined,
    id: string,
    banned: boolean,
  ): Promise<Outcome<void>> {
    const denied = adminDenied(actor);
    if (denied) return denied;
    const target = await this.get(id);
    if (!target.ok) return target;
    if (!canDisciplineUser(actor as User, target.value)) {
      return failure(
        'forbidden',
        'Only member accounts can be banned or unbanned',
      );
    }
    try {
      await this.dependencies.effects.setUserBanned(id, banned);
      return success(undefined);
    } catch {
      return failure(
        'dependency_failure',
        banned ? 'Could not ban the user' : 'Could not unban the user',
      );
    }
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
    if (target.value.role >= Role.President) {
      return failure(
        'forbidden',
        'Presidents and developers cannot be removed from this screen',
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
  ): Promise<Outcome<ManagedUser>> {
    const denied = adminDenied(actor);
    if (denied) return denied;
    const administrator = actor as User;
    const target = await this.get(id);
    if (!target.ok) return target;
    if (target.value.banned) {
      return failure('conflict', 'Unban this account before changing its role');
    }
    if (target.value.role >= Role.President) {
      return failure(
        'forbidden',
        'President and developer roles cannot be changed with promotion controls',
      );
    }
    const role = Math.max(
      Role.Member,
      Math.min(Role.VicePresident, target.value.role + change),
    ) as Role;
    if (role === target.value.role) {
      return failure('conflict', 'The user is already at that role boundary');
    }
    if (!canChangeUserRole(administrator, target.value, role)) {
      return failure(
        'forbidden',
        'Your role cannot make that promotion or demotion',
      );
    }
    const updated = parseManagedUser({ ...target.value, role });
    try {
      await this.dependencies.effects.updateUserRole(id, role);
      return success(updated);
    } catch {
      return failure('dependency_failure', 'Could not update the user role');
    }
  }

  private async get(id: string): Promise<Outcome<ManagedUser>> {
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
    return failure('forbidden', 'Only officers may manage users');
  }
  return undefined;
}
