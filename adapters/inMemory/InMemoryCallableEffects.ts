import {
  AnnouncementNotification,
  ApplicationEffects,
  WhitelistCredentials,
} from '../../core/ports';
import {
  AchievementId,
  InaturalistAccountLinkStatus,
} from '../../core/domain';

type Operation =
  | 'notifyAnnouncement'
  | 'provisionWhitelistUser'
  | 'emailWhitelistCredentials'
  | 'removeProvisionedUser'
  | 'updateUserRole'
  | 'addDisciplinaryNotice'
  | 'setUserBanned'
  | 'transferPresidency'
  | 'removeUser'
  | 'deleteOwnAccount'
  | 'syncPublicProfile'
  | 'updatePublicProfile'
  | 'selectProfileTitle'
  | 'migrateContributorPrivacy'
  | 'beginInaturalistAccountLink'
  | 'getInaturalistAccountLinkStatus'
  | 'unlinkInaturalistAccount';

export class InMemoryCallableEffects implements ApplicationEffects {
  readonly operations: string[] = [];
  readonly notifications: AnnouncementNotification[] = [];
  readonly #userIds: string[];
  readonly #failures = new Map<Operation, Error>();
  inaturalistLinkStatus: InaturalistAccountLinkStatus = {
    status: 'unlinked',
  };

  constructor(userIds: readonly string[] = []) {
    this.#userIds = [...userIds];
  }

  failNext(operation: Operation, error: Error): void {
    this.#failures.set(operation, error);
  }

  async notifyAnnouncement(
    notification: AnnouncementNotification,
  ): Promise<void> {
    this.maybeFail('notifyAnnouncement');
    this.notifications.push(notification);
    this.operations.push(`notify:${notification.title}`);
  }

  async provisionWhitelistUser(
    credentials: WhitelistCredentials,
  ): Promise<string> {
    this.maybeFail('provisionWhitelistUser');
    const id = this.#userIds.shift();
    if (!id) throw new Error('No deterministic provisioned user IDs remain');
    this.operations.push(`provision:${credentials.email}`);
    return id;
  }

  async emailWhitelistCredentials(
    credentials: WhitelistCredentials,
  ): Promise<void> {
    this.maybeFail('emailWhitelistCredentials');
    this.operations.push(`email:${credentials.email}`);
  }

  async removeProvisionedUser(userId: string): Promise<void> {
    this.maybeFail('removeProvisionedUser');
    this.operations.push(`remove-provisioned:${userId}`);
  }

  async updateUserRole(userId: string, role: number): Promise<void> {
    this.maybeFail('updateUserRole');
    this.operations.push(`update-role:${userId}:${role}`);
  }

  async addDisciplinaryNotice(userId: string, message: string): Promise<void> {
    this.maybeFail('addDisciplinaryNotice');
    this.operations.push(`discipline:${userId}:${message}`);
  }

  async setUserBanned(userId: string, banned: boolean): Promise<void> {
    this.maybeFail('setUserBanned');
    this.operations.push(`${banned ? 'ban' : 'unban'}:${userId}`);
  }

  async transferPresidency(userId: string): Promise<void> {
    this.maybeFail('transferPresidency');
    this.operations.push(`transfer-presidency:${userId}`);
  }

  async removeUser(userId: string): Promise<void> {
    this.maybeFail('removeUser');
    this.operations.push(`remove-user:${userId}`);
  }

  async deleteOwnAccount(confirmation: string): Promise<void> {
    this.maybeFail('deleteOwnAccount');
    this.operations.push(`delete-own-account:${confirmation}`);
  }

  async syncPublicProfile(userId?: string): Promise<void> {
    this.maybeFail('syncPublicProfile');
    this.operations.push(`sync-public-profile:${userId ?? 'self'}`);
  }

  async updatePublicProfile(profile: {
    readonly displayName: string;
    readonly bio: string;
    readonly profilePhotoUrl: string;
  }): Promise<void> {
    this.maybeFail('updatePublicProfile');
    this.operations.push(
      `update-public-profile:${profile.displayName}:${profile.bio}:${profile.profilePhotoUrl}`,
    );
  }

  async selectProfileTitle(achievementId: AchievementId | ''): Promise<void> {
    this.maybeFail('selectProfileTitle');
    this.operations.push(`select-profile-title:${achievementId}`);
  }

  async migrateContributorPrivacy(): Promise<void> {
    this.maybeFail('migrateContributorPrivacy');
    this.operations.push('migrate-contributor-privacy');
  }

  async beginInaturalistAccountLink() {
    this.maybeFail('beginInaturalistAccountLink');
    this.operations.push('begin-inaturalist-account-link');
    return {
      authorizationUrl: 'https://www.inaturalist.org/oauth/authorize',
      attemptId: 'attempt-1',
    };
  }

  async getInaturalistAccountLinkStatus(attemptId?: string) {
    this.maybeFail('getInaturalistAccountLinkStatus');
    this.operations.push(
      `inaturalist-account-link-status:${attemptId ?? 'current'}`,
    );
    return this.inaturalistLinkStatus;
  }

  async unlinkInaturalistAccount(): Promise<void> {
    this.maybeFail('unlinkInaturalistAccount');
    this.operations.push('unlink-inaturalist-account');
    this.inaturalistLinkStatus = { status: 'unlinked' };
  }

  private maybeFail(operation: Operation): void {
    const failure = this.#failures.get(operation);
    if (failure) {
      this.#failures.delete(operation);
      throw failure;
    }
  }
}
