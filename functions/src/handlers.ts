import { BillingSummary } from './billing';

export type Role = 0 | 1 | 2 | 3 | 4;

export interface ManagedUser {
  readonly id: string;
  readonly email: string;
  readonly role: Role;
  readonly clubId: string;
  readonly platformAdmin?: boolean;
  readonly banned?: boolean;
}

export type AchievementId =
  | 'profile-photo'
  | 'president'
  | 'first-sighting'
  | 'ten-sightings'
  | 'hundred-sightings';

export interface PublicProfile {
  readonly id: string;
  readonly displayName: string;
  readonly bio: string;
  readonly profilePhotoUrl: string;
  readonly role: Role;
  readonly achievementIds: readonly AchievementId[];
  readonly selectedTitleId: AchievementId | '';
  readonly clubId: string;
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
  getPlatformAdmin(id: string): Promise<ManagedUser | undefined>;
  getBillingSummary(): Promise<BillingSummary>;
  listPushTokens(clubId: string): Promise<readonly string[]>;
  sendPushBatch(messages: readonly PushMessage[]): Promise<void>;
  createAuthUser(email: string, password: string): Promise<string>;
  deleteAuthUser(id: string): Promise<void>;
  putUser(user: ManagedUser): Promise<void>;
  deleteUser(id: string): Promise<void>;
  updateUserRole(id: string, role: Role): Promise<void>;
  addDisciplinaryNotice(
    id: string,
    message: string,
    actor: ManagedUser,
  ): Promise<void>;
  setUserBanned(
    id: string,
    banned: boolean,
    actor: ManagedUser,
  ): Promise<void>;
  transferPresidency(actorId: string, successorId: string): Promise<void>;
  sendWhitelistCredentials(email: string, password: string): Promise<void>;
  findWhitelistByEmail(email: string): Promise<boolean>;
  createWhitelistApplication(
    application: WhitelistApplication,
  ): Promise<{ readonly created: boolean; readonly id: string }>;
  getPublicProfile(id: string, clubId: string): Promise<PublicProfile | undefined>;
  putPublicProfile(
    profile: PublicProfile,
    mode: 'sync' | 'edit' | 'title',
    clubId: string,
  ): Promise<PublicProfile>;
  countUserSightings(id: string, clubId: string): Promise<number>;
  verifyProfilePhoto(id: string, url: string, clubId: string): Promise<boolean>;
  migrateContributorPrivacy(clubId: string): Promise<{
    readonly sightings: number;
    readonly catalog: number;
  }>;
}

export type HandlerErrorCode =
  | 'unauthenticated'
  | 'permission-denied'
  | 'invalid-argument'
  | 'already-exists'
  | 'failed-precondition'
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

export async function handleGetBillingSummary(
  request: HandlerRequest<Record<string, never>>,
  dependencies: HandlerDependencies,
): Promise<BillingSummary> {
  if (!request.authUid) {
    throw new HandlerError('unauthenticated', 'Authentication required');
  }
  const actor = await dependencies.getPlatformAdmin(request.authUid);
  if (!actor) {
    throw new HandlerError(
      'permission-denied',
      'Platform administrator access required',
    );
  }
  return dependencies.getBillingSummary();
}

export async function handleMigrateContributorPrivacy(
  request: HandlerRequest<Record<string, never>>,
  dependencies: HandlerDependencies,
): Promise<{ readonly sightings: number; readonly catalog: number }> {
  const actor = await requireUser(request.authUid, dependencies);
  if (actor.role !== 3) {
    throw new HandlerError(
      'permission-denied',
      'Only the President may manage contributor privacy',
    );
  }
  return dependencies.migrateContributorPrivacy(actor.clubId);
}

export async function handleSyncPublicProfile(
  request: HandlerRequest<{ readonly userId?: unknown }>,
  dependencies: HandlerDependencies,
): Promise<PublicProfile> {
  const requestingUser = await requireUser(request.authUid, dependencies);
  const requestedUserId =
    request.data.userId === undefined
      ? requestingUser.id
      : requiredString(request.data.userId, 'userId');
  const profileOwner =
    requestedUserId === requestingUser.id
      ? requestingUser
      : await dependencies.getUser(requestedUserId);
  if (!profileOwner || profileOwner.banned) {
    throw new HandlerError('not-found', 'Member profile not found');
  }
  if (profileOwner.clubId !== requestingUser.clubId) {
    throw new HandlerError('not-found', 'Member profile not found');
  }
  const existing = await dependencies.getPublicProfile(
    profileOwner.id,
    requestingUser.clubId,
  );
  const sightingCount = await dependencies.countUserSightings(
    profileOwner.id,
    requestingUser.clubId,
  );
  const achievementIds = mergeAchievementIds(
    existing?.achievementIds ?? [],
    progressAchievementIds({
      hasProfilePhoto: Boolean(existing?.profilePhotoUrl),
      isPresident: profileOwner.role === 3,
      sightingCount,
    }),
  );
  const selectedTitleId =
    existing?.selectedTitleId && achievementIds.includes(existing.selectedTitleId)
      ? existing.selectedTitleId
      : '';
  const profile: PublicProfile = {
    id: profileOwner.id,
    displayName:
      existing?.displayName || defaultDisplayName(profileOwner.email),
    bio: existing?.bio ?? '',
    profilePhotoUrl: existing?.profilePhotoUrl ?? '',
    role: profileOwner.role,
    achievementIds,
    selectedTitleId,
    clubId: requestingUser.clubId,
  };
  return dependencies.putPublicProfile(profile, 'sync', requestingUser.clubId);
}

export async function handleUpdatePublicProfile(
  request: HandlerRequest<{
    readonly displayName?: unknown;
    readonly bio?: unknown;
    readonly profilePhotoUrl?: unknown;
  }>,
  dependencies: HandlerDependencies,
): Promise<PublicProfile> {
  const actor = await requireUser(request.authUid, dependencies);
  const displayName = requiredString(request.data.displayName, 'displayName');
  const bio = stringValue(request.data.bio, 'bio').trim();
  const profilePhotoUrl = stringValue(
    request.data.profilePhotoUrl,
    'profilePhotoUrl',
  ).trim();
  if (displayName.length > 60) {
    throw new HandlerError(
      'invalid-argument',
      'Display name cannot exceed 60 characters',
    );
  }
  if (bio.length > 500) {
    throw new HandlerError('invalid-argument', 'Bio cannot exceed 500 characters');
  }
  if (
    profilePhotoUrl.length > 2048 ||
    !validProfilePhotoUrl(profilePhotoUrl, actor.id)
  ) {
    throw new HandlerError('invalid-argument', 'Profile photo URL is invalid');
  }
  if (
    profilePhotoUrl &&
    !(await dependencies.verifyProfilePhoto(actor.id, profilePhotoUrl, actor.clubId))
  ) {
    throw new HandlerError(
      'invalid-argument',
      'Profile photo must be an uploaded image owned by your account',
    );
  }

  const existing = await dependencies.getPublicProfile(actor.id, actor.clubId);
  const achievementIds = profilePhotoUrl
    ? mergeAchievementIds(existing?.achievementIds ?? [], ['profile-photo'])
    : [...(existing?.achievementIds ?? [])];
  const selectedTitleId =
    existing?.selectedTitleId && achievementIds.includes(existing.selectedTitleId)
      ? existing.selectedTitleId
      : '';
  const profile: PublicProfile = {
    id: actor.id,
    displayName,
    bio,
    profilePhotoUrl,
    role: actor.role,
    achievementIds,
    selectedTitleId,
    clubId: actor.clubId,
  };
  return dependencies.putPublicProfile(profile, 'edit', actor.clubId);
}

export async function handleSelectProfileTitle(
  request: HandlerRequest<{ readonly achievementId?: unknown }>,
  dependencies: HandlerDependencies,
): Promise<PublicProfile> {
  const actor = await requireUser(request.authUid, dependencies);
  const achievementId = optionalAchievementId(request.data.achievementId);
  const existing = await dependencies.getPublicProfile(actor.id, actor.clubId);
  if (!existing) throw new HandlerError('not-found', 'Member profile not found');
  if (achievementId && !existing.achievementIds.includes(achievementId)) {
    throw new HandlerError(
      'permission-denied',
      'That title has not been unlocked',
    );
  }
  const profile: PublicProfile = {
    ...existing,
    role: actor.role,
    selectedTitleId: achievementId,
  };
  return dependencies.putPublicProfile(profile, 'title', actor.clubId);
}

export async function handleSendAnnouncement(
  request: HandlerRequest<{ readonly title?: unknown; readonly message?: unknown }>,
  dependencies: HandlerDependencies,
): Promise<{ readonly success: true; readonly sent: number }> {
  const actor = await requireAdmin(request.authUid, dependencies);
  const title = requiredString(request.data.title, 'title');
  const body = requiredString(request.data.message, 'message');
  const tokens = [
    ...new Set((await dependencies.listPushTokens(actor.clubId)).filter(Boolean)),
  ];
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
  const actor = await requireAdmin(request.authUid, dependencies);
  const email = validEmail(request.data.email);
  const password = requiredString(request.data.password, 'password');
  const uid = await dependencies.createAuthUser(email, password);
  try {
    await dependencies.putUser({
      id: uid,
      email,
      role: 0,
      clubId: actor.clubId,
      banned: false,
    });
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
  if (target.role >= 3) {
    throw new HandlerError(
      'permission-denied',
      'Presidents and developers cannot be removed through user management',
    );
  }
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
  const role = validManagedRole(request.data.role);
  const target = await dependencies.getUser(userId);
  if (!target) throw new HandlerError('not-found', 'User not found');
  requireCanManage(actor, target);
  if (target.banned) {
    throw new HandlerError(
      'permission-denied',
      'Unban this account before changing its role',
    );
  }
  if (target.role >= 3) {
    throw new HandlerError(
      'permission-denied',
      'President and developer roles require a dedicated workflow',
    );
  }
  requireCanChangeRole(actor, target, role);
  await dependencies.updateUserRole(userId, role);
  return { success: true };
}

export async function handleAddDisciplinaryNotice(
  request: HandlerRequest<{ readonly userId?: unknown; readonly message?: unknown }>,
  dependencies: HandlerDependencies,
): Promise<{ readonly success: true }> {
  const actor = await requireAdmin(request.authUid, dependencies);
  const userId = requiredString(request.data.userId, 'userId');
  const message = requiredString(request.data.message, 'message');
  if (message.length > 500) {
    throw new HandlerError(
      'invalid-argument',
      'A disciplinary notice cannot exceed 500 characters',
    );
  }
  const target = await dependencies.getUser(userId);
  if (!target) throw new HandlerError('not-found', 'User not found');
  requireCanDiscipline(actor, target);
  await dependencies.addDisciplinaryNotice(userId, message, actor);
  return { success: true };
}

export async function handleSetUserBanned(
  request: HandlerRequest<{ readonly userId?: unknown; readonly banned?: unknown }>,
  dependencies: HandlerDependencies,
): Promise<{ readonly success: true }> {
  const actor = await requireAdmin(request.authUid, dependencies);
  const userId = requiredString(request.data.userId, 'userId');
  const banned = booleanValue(request.data.banned, 'banned');
  const target = await dependencies.getUser(userId);
  if (!target) throw new HandlerError('not-found', 'User not found');
  requireCanDiscipline(actor, target);
  await dependencies.setUserBanned(userId, banned, actor);
  return { success: true };
}

export async function handleTransferPresidency(
  request: HandlerRequest<{ readonly userId?: unknown }>,
  dependencies: HandlerDependencies,
): Promise<{ readonly success: true; readonly actorRole: 1 | 4 }> {
  const actor = await requireAdmin(request.authUid, dependencies);
  const userId = requiredString(request.data.userId, 'userId');
  const target = await dependencies.getUser(userId);
  if (!target) throw new HandlerError('not-found', 'User not found');
  if (actor.clubId !== target.clubId) {
    throw new HandlerError('not-found', 'User not found');
  }
  if (target.role !== 2) {
    throw new HandlerError(
      'invalid-argument',
      'The presidential successor must be a Vice-President',
    );
  }
  if (target.banned) {
    throw new HandlerError(
      'permission-denied',
      'A banned account cannot become President',
    );
  }
  if (actor.id === target.id || (actor.role !== 3 && actor.role !== 4)) {
    throw new HandlerError(
      'permission-denied',
      'Only the current President, or a Developer when none exists, may crown a President',
    );
  }
  await dependencies.transferPresidency(actor.id, target.id);
  return { success: true, actorRole: actor.role === 3 ? 1 : 4 };
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
  if (!user || user.banned || user.role < 1) {
    throw new HandlerError('permission-denied', 'Officer access required');
  }
  return user;
}

async function requireUser(
  uid: string | undefined,
  dependencies: HandlerDependencies,
): Promise<ManagedUser> {
  if (!uid) throw new HandlerError('unauthenticated', 'Authentication required');
  const user = await dependencies.getUser(uid);
  if (!user || user.banned) {
    throw new HandlerError('permission-denied', 'Active membership required');
  }
  return user;
}

function requireCanDiscipline(
  actor: ManagedUser,
  target: ManagedUser,
): void {
  if (
    actor.clubId !== target.clubId ||
    actor.id === target.id ||
    target.role !== 0
  ) {
    throw new HandlerError(
      'permission-denied',
      'Only member accounts can be disciplined, banned, or unbanned',
    );
  }
}

function requireCanManage(actor: ManagedUser, target: ManagedUser): void {
  if (
    actor.clubId !== target.clubId ||
    actor.id === target.id ||
    actor.role <= target.role
  ) {
    throw new HandlerError(
      'permission-denied',
      'Cannot manage yourself or a user with an equal or higher role',
    );
  }
}

function requireCanChangeRole(
  actor: ManagedUser,
  target: ManagedUser,
  nextRole: Role,
): void {
  if (actor.clubId !== target.clubId) {
    throw new HandlerError('permission-denied', 'Member belongs to another club');
  }
  const changesOfficerStatus =
    (target.role === 0 && nextRole === 1) ||
    (target.role === 1 && nextRole === 0);
  const changesVicePresidentStatus =
    (target.role === 1 && nextRole === 2) ||
    (target.role === 2 && nextRole === 1);
  const allowed =
    (changesOfficerStatus && actor.role >= 2) ||
    (changesVicePresidentStatus && actor.role >= 3);

  if (!allowed) {
    throw new HandlerError(
      'permission-denied',
      'Your role cannot make that promotion or demotion',
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

function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new HandlerError('invalid-argument', `${field} must be a boolean`);
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

function validManagedRole(value: unknown): Role {
  if (value !== 0 && value !== 1 && value !== 2) {
    throw new HandlerError(
      'invalid-argument',
      'Ordinary role changes are limited to member, officer, or vice-president',
    );
  }
  return value;
}

const achievementIds: readonly AchievementId[] = [
  'profile-photo',
  'president',
  'first-sighting',
  'ten-sightings',
  'hundred-sightings',
];

function optionalAchievementId(value: unknown): AchievementId | '' {
  if (value === '') return '';
  if (
    typeof value !== 'string' ||
    !achievementIds.includes(value as AchievementId)
  ) {
    throw new HandlerError('invalid-argument', 'achievementId is invalid');
  }
  return value as AchievementId;
}

function mergeAchievementIds(
  existing: readonly AchievementId[],
  additions: readonly AchievementId[],
): AchievementId[] {
  const unlocked = new Set<AchievementId>(existing);
  for (const id of additions) unlocked.add(id);
  return achievementIds.filter((id) => unlocked.has(id));
}

function progressAchievementIds({
  hasProfilePhoto,
  isPresident,
  sightingCount,
}: {
  readonly hasProfilePhoto: boolean;
  readonly isPresident: boolean;
  readonly sightingCount: number;
}): AchievementId[] {
  const unlocked: AchievementId[] = [];
  if (hasProfilePhoto) unlocked.push('profile-photo');
  if (isPresident) unlocked.push('president');
  if (sightingCount >= 1) unlocked.push('first-sighting');
  if (sightingCount >= 10) unlocked.push('ten-sightings');
  if (sightingCount >= 100) unlocked.push('hundred-sightings');
  return unlocked;
}

function defaultDisplayName(email: string): string {
  return (email.split('@')[0]?.trim() || 'Campus Cats member').slice(0, 60);
}

function validProfilePhotoUrl(value: string, userId: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    const decodedPath = decodeURIComponent(url.pathname);
    const trustedHost =
      url.hostname === 'firebasestorage.googleapis.com' ||
      url.hostname === 'storage.googleapis.com' ||
      (process.env.FUNCTIONS_EMULATOR === 'true' &&
        (url.hostname === '127.0.0.1' || url.hostname === 'localhost'));
    return (
      trustedHost &&
      (url.protocol === 'https:' || process.env.FUNCTIONS_EMULATOR === 'true') &&
      decodedPath.includes(`/public-profiles/${userId}/`)
    );
  } catch {
    return false;
  }
}
