import { FirebaseTenantScope } from './FirebaseTenantScope';

describe('FirebaseTenantScope', () => {
  it('requires an explicit selection instead of assuming Georgia Tech', () => {
    const scope = new FirebaseTenantScope();

    expect(() => scope.clubId).toThrow('Club identity is required');
  });

  it('lets authenticated profile tenancy override and then reveal device selection', () => {
    const scope = new FirebaseTenantScope();
    scope.setSelectedClub('campus-cats');
    expect(scope.clubId).toBe('campus-cats');

    scope.setAuthenticatedClub('club-139658');
    expect(scope.clubId).toBe('club-139658');

    scope.clearAuthenticatedClub();
    expect(scope.clubId).toBe('campus-cats');
  });
});
