import type {
  AchievementId,
  InaturalistAccountLinkAuthorization,
  InaturalistAccountLinkStatus,
} from '../../core/domain';
import type {
  AnnouncementNotification,
  ApplicationEffects,
  WhitelistCredentials,
} from '../../core/ports';

const messagingDisabled = (): never => {
  throw new Error('Outbound messaging is disabled in development');
};

export class DevelopmentApplicationEffects implements ApplicationEffects {
  constructor(private readonly developmentEffects: ApplicationEffects) {}

  async notifyAnnouncement(
    _notification: AnnouncementNotification,
  ): Promise<void> {
    return messagingDisabled();
  }

  async provisionWhitelistUser(
    _credentials: WhitelistCredentials,
  ): Promise<string> {
    return messagingDisabled();
  }

  async emailWhitelistCredentials(
    _credentials: WhitelistCredentials,
  ): Promise<void> {
    return messagingDisabled();
  }

  async removeProvisionedUser(userId: string): Promise<void> {
    return this.developmentEffects.removeProvisionedUser(userId);
  }

  async updateUserRole(userId: string, role: number): Promise<void> {
    return this.developmentEffects.updateUserRole(userId, role);
  }

  async addDisciplinaryNotice(
    userId: string,
    message: string,
  ): Promise<void> {
    return this.developmentEffects.addDisciplinaryNotice(userId, message);
  }

  async setUserBanned(userId: string, banned: boolean): Promise<void> {
    return this.developmentEffects.setUserBanned(userId, banned);
  }

  async transferPresidency(userId: string): Promise<void> {
    return this.developmentEffects.transferPresidency(userId);
  }

  async removeUser(userId: string): Promise<void> {
    return this.developmentEffects.removeUser(userId);
  }

  async deleteOwnAccount(confirmation: string): Promise<void> {
    return this.developmentEffects.deleteOwnAccount(confirmation);
  }

  async syncPublicProfile(userId?: string): Promise<void> {
    return this.developmentEffects.syncPublicProfile(userId);
  }

  async updatePublicProfile(profile: {
    readonly displayName: string;
    readonly bio: string;
    readonly profilePhotoUrl: string;
  }): Promise<void> {
    return this.developmentEffects.updatePublicProfile(profile);
  }

  async selectProfileTitle(achievementId: AchievementId | ''): Promise<void> {
    return this.developmentEffects.selectProfileTitle(achievementId);
  }

  async migrateContributorPrivacy(): Promise<void> {
    return this.developmentEffects.migrateContributorPrivacy();
  }

  async beginInaturalistAccountLink(): Promise<InaturalistAccountLinkAuthorization> {
    return this.developmentEffects.beginInaturalistAccountLink();
  }

  async getInaturalistAccountLinkStatus(
    attemptId?: string,
  ): Promise<InaturalistAccountLinkStatus> {
    return this.developmentEffects.getInaturalistAccountLinkStatus(attemptId);
  }

  async unlinkInaturalistAccount(): Promise<void> {
    return this.developmentEffects.unlinkInaturalistAccount();
  }
}

export const createApplicationEffectsGateway = (
  firebaseEffects: ApplicationEffects,
  appEnvironment: string | undefined = process.env.EXPO_PUBLIC_APP_ENV,
): ApplicationEffects =>
  appEnvironment === 'development'
    ? new DevelopmentApplicationEffects(firebaseEffects)
    : firebaseEffects;
