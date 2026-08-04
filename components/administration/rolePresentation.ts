import { Role } from '../../core/domain';

export const roleLabel = (role: Role): string =>
  ({
    [Role.Member]: 'Member',
    [Role.Admin]: 'Administrator',
    [Role.SuperAdmin]: 'Super administrator',
  })[role];
