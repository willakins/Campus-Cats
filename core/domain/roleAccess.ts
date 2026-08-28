import { Role, hasMinimumRole } from './roles';

export interface RoleAccessPolicy {
  readonly minimumRole: Role;
  readonly capability: string;
  readonly publicContext?: string;
}

const policy = (
  minimumRole: Role,
  capability: string,
  publicContext?: string,
): RoleAccessPolicy => Object.freeze({ minimumRole, capability, publicContext });

/**
 * The single source of truth for role-restricted capabilities.
 *
 * Feature modules and pages must consume the same entry. Changing an entry's
 * minimum role therefore updates enforcement, cascading access, and UI copy.
 */
export const roleAccessPolicies = Object.freeze({
  manageAnnouncements: policy(
    Role.Officer,
    'create, edit, or delete announcements',
    'Everyone can read club announcements.',
  ),
  manageCatalog: policy(
    Role.Officer,
    'create, edit, or delete catalog entries',
    'Everyone can browse cat profiles.',
  ),
  manageStations: policy(
    Role.Officer,
    'view or manage feeding-station operations',
  ),
  manageEvents: policy(Role.Officer, 'create, edit, or delete events'),
  manageSurveys: policy(Role.Officer, 'create or manage surveys'),
  manageCatalogTags: policy(Role.Officer, 'manage catalog tags'),
  manageContacts: policy(Role.Officer, 'manage club contacts'),
  pingClubMembers: policy(Role.Officer, 'ping all club members'),
  manageMembershipApplications: policy(
    Role.Officer,
    'review membership applications',
  ),
  manageUsers: policy(Role.Officer, 'manage member accounts'),
  manageInaturalist: policy(Role.Officer, 'manage imported iNaturalist data'),
  viewSurveyResponses: policy(Role.Officer, 'view survey responses'),
  createContests: policy(Role.Officer, 'create community contests'),
  createPresidentialElections: policy(
    Role.President,
    'start presidential elections',
  ),
  manageAppSettings: policy(Role.President, 'manage app settings'),
  manageDonations: policy(Role.President, 'set up or edit donations'),
  manageClubBilling: policy(Role.President, 'manage club billing'),
  viewInfrastructureCosts: policy(
    Role.Developer,
    'view infrastructure costs',
  ),
});

export const canAccessRolePolicy = (
  role: Role,
  accessPolicy: RoleAccessPolicy,
): boolean => hasMinimumRole(role, accessPolicy.minimumRole);

export const roleAccessLevelName = (minimumRole: Role): string => {
  if (minimumRole >= Role.Developer) return 'Developer-only';
  if (minimumRole >= Role.President) return 'President-level';
  if (minimumRole >= Role.VicePresident) return 'Vice President-level';
  return 'Officer-level';
};

export const roleAccessRequirement = (
  accessPolicy: RoleAccessPolicy,
): string =>
  `${roleAccessLevelName(accessPolicy.minimumRole)} access is required to ${accessPolicy.capability}`;
