import {
  Role,
  canChangeUserRole,
  canDisciplineUser,
  canManageFeature,
  canManageAppSettings,
  canManageUser,
  canModifySighting,
  canTransferPresidency,
  canViewContributors,
  classifyRole,
  failure,
  hasMinimumRole,
  success,
  RoleClassification,
  canAccessRolePolicy,
  roleAccessPolicies,
} from './index';

describe('typed outcomes', () => {
  it('represents successful values with non-fatal warnings', () => {
    expect(
      success({ id: 'announcement-1' }, [
        { code: 'notification_failed', message: 'Saved without push delivery' },
      ]),
    ).toEqual({
      ok: true,
      value: { id: 'announcement-1' },
      warnings: [
        { code: 'notification_failed', message: 'Saved without push delivery' },
      ],
    });
  });

  it('represents failures with a stable caller-facing code', () => {
    expect(failure('forbidden', 'Only administrators may do that')).toEqual({
      ok: false,
      error: {
        code: 'forbidden',
        message: 'Only administrators may do that',
      },
    });
  });
});

describe('authorization policy', () => {
  it.each([
    [Role.Member, false],
    [Role.Officer, true],
    [Role.VicePresident, true],
    [Role.President, true],
    [Role.Developer, true],
  ])('limits managed features for role %s', (role, allowed) => {
    expect(canManageFeature(role)).toBe(allowed);
  });

  it.each([
    [Role.Member, RoleClassification.Member],
    [Role.Officer, RoleClassification.Power],
    [Role.VicePresident, RoleClassification.Power],
    [Role.President, RoleClassification.Power],
    [Role.Developer, RoleClassification.Power],
  ])('classifies role %s as %s', (role, classification) => {
    expect(classifyRole(role)).toBe(classification);
  });

  it.each([
    [Role.Member, Role.Member, false],
    [Role.Officer, Role.Member, true],
    [Role.VicePresident, Role.Member, true],
    [Role.President, Role.Member, true],
    [Role.Developer, Role.Member, true],
    [Role.Developer, Role.Officer, false],
    [Role.Developer, Role.VicePresident, false],
    [Role.Developer, Role.President, false],
    [Role.Developer, Role.Developer, false],
  ])('allows power role %s to discipline target role %s: %s', (
    actorRole,
    targetRole,
    allowed,
  ) => {
    expect(canDisciplineUser(
      { id: 'actor', role: actorRole },
      { id: 'target', role: targetRole },
    )).toBe(allowed);
  });

  it.each([
    [Role.Member, Role.Member, false],
    [Role.Officer, Role.Member, true],
    [Role.Officer, Role.Officer, false],
    [Role.Officer, Role.VicePresident, false],
    [Role.Officer, Role.Developer, false],
    [Role.VicePresident, Role.Member, true],
    [Role.VicePresident, Role.Officer, true],
    [Role.VicePresident, Role.VicePresident, false],
    [Role.VicePresident, Role.President, false],
    [Role.VicePresident, Role.Developer, false],
    [Role.President, Role.Member, true],
    [Role.President, Role.Officer, true],
    [Role.President, Role.VicePresident, true],
    [Role.President, Role.President, false],
    [Role.President, Role.Developer, false],
    [Role.Developer, Role.Member, true],
    [Role.Developer, Role.Officer, true],
    [Role.Developer, Role.VicePresident, true],
    [Role.Developer, Role.President, true],
    [Role.Developer, Role.Developer, false],
  ])(
    'allows role %s to manage role %s only down the hierarchy',
    (actorRole, targetRole, allowed) => {
      expect(
        canManageUser(
          { id: 'actor', role: actorRole },
          { id: 'target', role: targetRole },
        ),
      ).toBe(allowed);
    },
  );

  it.each([
    [Role.Member, false],
    [Role.Officer, false],
    [Role.VicePresident, false],
    [Role.President, true],
    [Role.Developer, true],
  ])('requires President-level access for app settings for role %s', (role, allowed) => {
    expect(canManageAppSettings(role)).toBe(allowed);
  });

  it('cascades authorization through the numeric role hierarchy', () => {
    expect(hasMinimumRole(Role.Developer, Role.President)).toBe(true);
    expect(hasMinimumRole(Role.President, Role.President)).toBe(true);
    expect(hasMinimumRole(Role.VicePresident, Role.President)).toBe(false);
  });

  it('uses capability policies as the cascading authorization source of truth', () => {
    expect(
      canAccessRolePolicy(Role.Officer, roleAccessPolicies.manageAnnouncements),
    ).toBe(true);
    expect(
      canAccessRolePolicy(Role.Member, roleAccessPolicies.pingClubMembers),
    ).toBe(false);
    expect(
      canAccessRolePolicy(Role.Officer, roleAccessPolicies.pingClubMembers),
    ).toBe(true);
    expect(
      canAccessRolePolicy(Role.President, roleAccessPolicies.manageDonations),
    ).toBe(true);
    expect(
      canAccessRolePolicy(Role.Developer, roleAccessPolicies.manageDonations),
    ).toBe(true);
    expect(
      canAccessRolePolicy(Role.VicePresident, roleAccessPolicies.manageDonations),
    ).toBe(false);
    expect(
      canAccessRolePolicy(
        Role.President,
        roleAccessPolicies.viewInfrastructureCosts,
      ),
    ).toBe(false);
    expect(
      canAccessRolePolicy(
        Role.Developer,
        roleAccessPolicies.viewInfrastructureCosts,
      ),
    ).toBe(true);
  });

  it('shows anonymous contributors only to officers', () => {
    expect(canViewContributors(Role.Member, true)).toBe(false);
    expect(canViewContributors(Role.Officer, true)).toBe(true);
    expect(canViewContributors(Role.Member, false)).toBe(true);
  });

  it('never allows self-management', () => {
    expect(
      canManageUser(
        { id: 'same-user', role: Role.VicePresident },
        { id: 'same-user', role: Role.Member },
      ),
    ).toBe(false);
  });

  it('allows President-level roles to run presidential succession', () => {
    const vicePresident = { id: 'vice', role: Role.VicePresident };
    expect(
      canTransferPresidency(
        { id: 'president', role: Role.President },
        vicePresident,
        true,
      ),
    ).toBe(true);
    expect(
      canTransferPresidency(
        { id: 'developer', role: Role.Developer },
        vicePresident,
        false,
      ),
    ).toBe(true);
    expect(
      canTransferPresidency(
        { id: 'developer', role: Role.Developer },
        vicePresident,
        true,
      ),
    ).toBe(true);
    expect(
      canTransferPresidency(
        { id: 'president', role: Role.President },
        { id: 'officer', role: Role.Officer },
        true,
      ),
    ).toBe(false);
  });

  it.each([
    [Role.Officer, Role.Member, Role.Officer, false],
    [Role.VicePresident, Role.Member, Role.Officer, true],
    [Role.VicePresident, Role.Officer, Role.Member, true],
    [Role.VicePresident, Role.Officer, Role.VicePresident, false],
    [Role.VicePresident, Role.VicePresident, Role.Officer, false],
    [Role.President, Role.Officer, Role.VicePresident, true],
    [Role.President, Role.VicePresident, Role.Officer, true],
    [Role.Developer, Role.Officer, Role.VicePresident, true],
    [Role.Developer, Role.VicePresident, Role.Officer, true],
    [Role.President, Role.Member, Role.VicePresident, false],
    [Role.Developer, Role.President, Role.VicePresident, false],
  ])(
    'allows role %s to change role %s to %s only through the authorized adjacent transition',
    (actorRole, targetRole, nextRole, allowed) => {
      expect(
        canChangeUserRole(
          { id: 'actor', role: actorRole },
          { id: 'target', role: targetRole },
          nextRole,
        ),
      ).toBe(allowed);
    },
  );

  it('allows sighting mutations only for the creator', () => {
    expect(canModifySighting('member-1', 'member-1')).toBe(true);
    expect(canModifySighting('admin-1', 'member-1')).toBe(false);
    expect(canModifySighting(undefined, 'member-1')).toBe(false);
  });
});
