export type Role = 0 | 1 | 2;

export interface ManagedUser {
  readonly id: string;
  readonly email: string;
  readonly role: Role;
}

export interface WhitelistApplication {
  readonly name: string;
  readonly graduationYear: string;
  readonly email: string;
  readonly codeWord: string;
}

export interface PushMessage {
  readonly to: string;
  readonly sound: 'default';
  readonly title: string;
  readonly body: string;
}

export interface HandlerDependencies {
  getUser(id: string): Promise<ManagedUser | undefined>;
  listPushTokens(): Promise<readonly string[]>;
  sendPushBatch(messages: readonly PushMessage[]): Promise<void>;
  createAuthUser(email: string, password: string): Promise<string>;
  deleteAuthUser(id: string): Promise<void>;
  putUser(user: ManagedUser): Promise<void>;
  deleteUser(id: string): Promise<void>;
  updateUserRole(id: string, role: Role): Promise<void>;
  sendWhitelistCredentials(email: string, password: string): Promise<void>;
  findWhitelistByEmail(email: string): Promise<boolean>;
  createWhitelistApplication(
    application: WhitelistApplication,
  ): Promise<{ readonly created: boolean; readonly id: string }>;
}

export type HandlerErrorCode =
  | 'unauthenticated'
  | 'permission-denied'
  | 'invalid-argument'
  | 'already-exists'
  | 'not-found'
  | 'internal';

export class HandlerError extends Error {
  constructor(
    readonly code: HandlerErrorCode,
    message: string,
  ) {
    super(message);
  }
}

interface HandlerRequest<T> {
  readonly authUid?: string;
  readonly data: T;
}

export async function handleSendAnnouncement(
  request: HandlerRequest<{ readonly title?: unknown; readonly message?: unknown }>,
  dependencies: HandlerDependencies,
): Promise<{ readonly success: true; readonly sent: number }> {
  await requireAdmin(request.authUid, dependencies);
  const title = requiredString(request.data.title, 'title');
  const body = requiredString(request.data.message, 'message');
  const tokens = [...new Set((await dependencies.listPushTokens()).filter(Boolean))];
  for (let index = 0; index < tokens.length; index += 100) {
    await dependencies.sendPushBatch(
      tokens.slice(index, index + 100).map((token) => ({
        to: token,
        sound: 'default',
        title,
        body,
      })),
    );
  }
  return { success: true, sent: tokens.length };
}

export async function handleSendWhitelistEmail(
  request: HandlerRequest<{ readonly email?: unknown; readonly password?: unknown }>,
  dependencies: HandlerDependencies,
): Promise<{ readonly success: true }> {
  await requireAdmin(request.authUid, dependencies);
  const email = validEmail(request.data.email);
  const password = requiredString(request.data.password, 'password');
  await dependencies.sendWhitelistCredentials(email, password);
  return { success: true };
}

export async function handleCreateWhitelistUser(
  request: HandlerRequest<{ readonly email?: unknown; readonly password?: unknown }>,
  dependencies: HandlerDependencies,
): Promise<{ readonly success: true; readonly uid: string }> {
  await requireAdmin(request.authUid, dependencies);
  const email = validEmail(request.data.email);
  const password = requiredString(request.data.password, 'password');
  const uid = await dependencies.createAuthUser(email, password);
  try {
    await dependencies.putUser({ id: uid, email, role: 0 });
  } catch (error) {
    try {
      await dependencies.deleteAuthUser(uid);
    } catch {
      throw new HandlerError(
        'internal',
        'User profile failed and the Auth account could not be removed',
      );
    }
    throw error;
  }
  return { success: true, uid };
}

export async function handleRemoveManagedUser(
  request: HandlerRequest<{ readonly userId?: unknown }>,
  dependencies: HandlerDependencies,
): Promise<{ readonly success: true }> {
  const actor = await requireAdmin(request.authUid, dependencies);
  const userId = requiredString(request.data.userId, 'userId');
  const target = await dependencies.getUser(userId);
  if (!target) throw new HandlerError('not-found', 'User not found');
  requireCanManage(actor, target);
  await dependencies.deleteAuthUser(userId);
  await dependencies.deleteUser(userId);
  return { success: true };
}

export async function handleUpdateUserRole(
  request: HandlerRequest<{ readonly userId?: unknown; readonly role?: unknown }>,
  dependencies: HandlerDependencies,
): Promise<{ readonly success: true }> {
  const actor = await requireAdmin(request.authUid, dependencies);
  const userId = requiredString(request.data.userId, 'userId');
  const role = validRole(request.data.role);
  const target = await dependencies.getUser(userId);
  if (!target) throw new HandlerError('not-found', 'User not found');
  requireCanManage(actor, target);
  if (role > actor.role) {
    throw new HandlerError(
      'permission-denied',
      'Cannot assign a role above your own',
    );
  }
  await dependencies.updateUserRole(userId, role);
  return { success: true };
}

export async function handleSubmitWhitelistApplication(
  request: HandlerRequest<Partial<WhitelistApplication>>,
  dependencies: HandlerDependencies,
): Promise<
  | { readonly status: 'created'; readonly id: string }
  | { readonly status: 'conflict' }
> {
  const application: WhitelistApplication = {
    name: requiredString(request.data.name, 'name'),
    graduationYear: requiredString(
      request.data.graduationYear,
      'graduationYear',
    ),
    email: validEmail(request.data.email),
    codeWord:
      request.data.codeWord === undefined
        ? ''
        : stringValue(request.data.codeWord, 'codeWord'),
  };
  if (await dependencies.findWhitelistByEmail(application.email)) {
    return { status: 'conflict' };
  }
  const result = await dependencies.createWhitelistApplication(application);
  return result.created
    ? { status: 'created', id: result.id }
    : { status: 'conflict' };
}

async function requireAdmin(
  uid: string | undefined,
  dependencies: HandlerDependencies,
): Promise<ManagedUser> {
  if (!uid) throw new HandlerError('unauthenticated', 'Authentication required');
  const user = await dependencies.getUser(uid);
  if (!user || user.role < 1) {
    throw new HandlerError('permission-denied', 'Administrator access required');
  }
  return user;
}

function requireCanManage(actor: ManagedUser, target: ManagedUser): void {
  if (actor.id === target.id || actor.role <= target.role) {
    throw new HandlerError(
      'permission-denied',
      'Cannot manage yourself or a user with an equal or higher role',
    );
  }
}

function requiredString(value: unknown, field: string): string {
  const parsed = stringValue(value, field).trim();
  if (!parsed) throw new HandlerError('invalid-argument', `${field} is required`);
  return parsed;
}

function stringValue(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new HandlerError('invalid-argument', `${field} must be a string`);
  }
  return value;
}

function validEmail(value: unknown): string {
  const email = requiredString(value, 'email').toLowerCase();
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    throw new HandlerError('invalid-argument', 'email must be valid');
  }
  return email;
}

function validRole(value: unknown): Role {
  if (value !== 0 && value !== 1 && value !== 2) {
    throw new HandlerError('invalid-argument', 'role must be 0, 1, or 2');
  }
  return value;
}
