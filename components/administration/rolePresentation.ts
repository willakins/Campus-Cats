import { Role } from '../../core/domain';

const roleLabels: Record<Role, readonly [singular: string, plural: string]> = {
  [Role.Member]: ['Member', 'Members'],
  [Role.Officer]: ['Officer', 'Officers'],
  [Role.VicePresident]: ['Vice-President', 'Vice-Presidents'],
  [Role.President]: ['President', 'Presidents'],
  [Role.Developer]: ['Developer', 'Developers'],
};

export const roleLabel = (role: Role, count = 1): string =>
  roleLabels[role][count === 1 ? 0 : 1];
