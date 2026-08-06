import { AchievementId } from '../domain/achievements';

export interface AnnouncementNotification {
  readonly title: string;
  readonly body: string;
}

export interface WhitelistCredentials {
  readonly email: string;
  readonly password: string;
}

export interface ApplicationEffects {
  notifyAnnouncement(notification: AnnouncementNotification): Promise<void>;
  provisionWhitelistUser(credentials: WhitelistCredentials): Promise<string>;
  emailWhitelistCredentials(credentials: WhitelistCredentials): Promise<void>;
  removeProvisionedUser(userId: string): Promise<void>;
  updateUserRole(userId: string, role: number): Promise<void>;
  addDisciplinaryNotice(userId: string, message: string): Promise<void>;
  setUserBanned(userId: string, banned: boolean): Promise<void>;
  transferPresidency(userId: string): Promise<void>;
  removeUser(userId: string): Promise<void>;
  syncPublicProfile(userId?: string): Promise<void>;
  updatePublicProfile(profile: {
    readonly displayName: string;
    readonly bio: string;
    readonly profilePhotoUrl: string;
  }): Promise<void>;
  selectProfileTitle(achievementId: AchievementId | ''): Promise<void>;
  migrateContributorPrivacy(): Promise<void>;
}
