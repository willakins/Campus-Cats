import {
  Role,
  canManageFeature,
  canManageUser,
  canModifySighting,
  failure,
  success,
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
    [Role.Admin, true],
    [Role.SuperAdmin, true],
  ])('limits managed features for role %s', (role, allowed) => {
    expect(canManageFeature(role)).toBe(allowed);
  });

  it.each([
    [Role.Member, Role.Member, false],
    [Role.Admin, Role.Member, true],
    [Role.Admin, Role.Admin, false],
    [Role.Admin, Role.SuperAdmin, false],
    [Role.SuperAdmin, Role.Member, true],
    [Role.SuperAdmin, Role.Admin, true],
    [Role.SuperAdmin, Role.SuperAdmin, false],
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

  it('never allows self-management', () => {
    expect(
      canManageUser(
        { id: 'same-user', role: Role.SuperAdmin },
        { id: 'same-user', role: Role.Member },
      ),
    ).toBe(false);
  });

  it('allows sighting mutations only for the creator', () => {
    expect(canModifySighting('member-1', 'member-1')).toBe(true);
    expect(canModifySighting('admin-1', 'member-1')).toBe(false);
    expect(canModifySighting(undefined, 'member-1')).toBe(false);
  });
});
