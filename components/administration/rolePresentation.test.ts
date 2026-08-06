import { Role } from '../../core/domain';
import { roleLabel } from './rolePresentation';

describe('roleLabel', () => {
  it.each([
    [Role.Member, 'Member', 'Members'],
    [Role.Officer, 'Officer', 'Officers'],
    [Role.VicePresident, 'Vice-President', 'Vice-Presidents'],
    [Role.President, 'President', 'Presidents'],
    [Role.Developer, 'Developer', 'Developers'],
  ])('pluralizes role %s based on the account count', (role, singular, plural) => {
    expect(roleLabel(role, 1)).toBe(singular);
    expect(roleLabel(role, 2)).toBe(plural);
    expect(roleLabel(role, 0)).toBe(plural);
  });
});
