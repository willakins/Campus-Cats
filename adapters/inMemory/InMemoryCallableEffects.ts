import {
  AnnouncementNotification,
  ApplicationEffects,
  WhitelistCredentials,
} from '../../core/ports';
import { AchievementId } from '../../core/domain';

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
  | 'syncPublicProfile'
  | 'updatePublicProfile'
  | 'selectProfileTitle'
  | 'migrateContributorPrivacy';

export class InMemoryCallableEffects implements ApplicationEffects {
  readonly operations: string[] = [];
  readonly notifications: AnnouncementNotification[] = [];
  readonly #userIds: string[];
  readonly #failures = new Map<Operation, Error>();

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

  private maybeFail(operation: Operation): void {
    const failure = this.#failures.get(operation);
    if (failure) {
      this.#failures.delete(operation);
      throw failure;
    }
  }
}
