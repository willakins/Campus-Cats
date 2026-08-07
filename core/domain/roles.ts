import { z } from 'zod';

export const Role = {
  Member: 0,
  Officer: 1,
  VicePresident: 2,
  President: 3,
  Developer: 4,
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const RoleClassification = {
  Member: 'member',
  Power: 'power',
} as const;

export type RoleClassification =
  (typeof RoleClassification)[keyof typeof RoleClassification];

export const roleSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

interface PolicyUser {
  readonly id: string;
  readonly role: Role;
}

export function canManageFeature(role: Role): boolean {
  return classifyRole(role) === RoleClassification.Power;
}

export function classifyRole(role: Role): RoleClassification {
  return role >= Role.Officer
    ? RoleClassification.Power
    : RoleClassification.Member;
}

export function isPowerRole(role: Role): boolean {
  return classifyRole(role) === RoleClassification.Power;
}

export function canAccessCloudConsoles(actor: {
  readonly platformAdmin?: boolean;
}): boolean {
  return actor.platformAdmin === true;
}

export function canManageAppSettings(role: Role): boolean {
  return role === Role.President;
}

export function canViewContributors(
  role: Role,
  sightingsAnonymous: boolean,
): boolean {
  return canManageFeature(role) || !sightingsAnonymous;
}

export function canManageUser(actor: PolicyUser, target: PolicyUser): boolean {
  return actor.id !== target.id && actor.role > target.role;
}

export function canDisciplineUser(
  actor: PolicyUser,
  target: PolicyUser,
): boolean {
  return actor.id !== target.id &&
    isPowerRole(actor.role) &&
    target.role === Role.Member;
}

export function canChangeUserRole(
  actor: PolicyUser,
  target: PolicyUser,
  nextRole: Role,
): boolean {
  if (actor.id === target.id || target.role >= Role.President) return false;
  if (Math.abs(nextRole - target.role) !== 1) return false;

  const changesOfficerStatus =
    (target.role === Role.Member && nextRole === Role.Officer) ||
    (target.role === Role.Officer && nextRole === Role.Member);
  if (changesOfficerStatus) return actor.role >= Role.VicePresident;

  const changesVicePresidentStatus =
    (target.role === Role.Officer && nextRole === Role.VicePresident) ||
    (target.role === Role.VicePresident && nextRole === Role.Officer);
  return changesVicePresidentStatus && actor.role >= Role.President;
}

export function canTransferPresidency(
  actor: PolicyUser,
  target: PolicyUser,
  hasPresident: boolean,
): boolean {
  if (target.role !== Role.VicePresident || actor.id === target.id) return false;
  return actor.role === Role.President ||
    (actor.role === Role.Developer && !hasPresident);
}

export function canModifySighting(
  actorId: string | undefined,
  creatorId: string,
): boolean {
  return actorId !== undefined && actorId === creatorId;
}
