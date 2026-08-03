import { z } from 'zod';

export const Role = {
  Member: 0,
  Admin: 1,
  SuperAdmin: 2,
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const roleSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);

interface PolicyUser {
  readonly id: string;
  readonly role: Role;
}

export function canManageFeature(role: Role): boolean {
  return role >= Role.Admin;
}

export function canManageUser(actor: PolicyUser, target: PolicyUser): boolean {
  return actor.id !== target.id && actor.role > target.role;
}

export function canModifySighting(
  actorId: string | undefined,
  creatorId: string,
): boolean {
  return actorId !== undefined && actorId === creatorId;
}
