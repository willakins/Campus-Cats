import { Functions, httpsCallable } from 'firebase/functions';

import {
  AnnouncementNotification,
  ApplicationEffects,
  WhitelistCredentials,
} from '../../core/ports';
import {
  AchievementId,
  InaturalistAccountLinkAuthorization,
  InaturalistAccountLinkStatus,
} from '../../core/domain';

export class FirebaseCallableEffects implements ApplicationEffects {
  constructor(private readonly functions: Functions) {}

  async notifyAnnouncement(
    notification: AnnouncementNotification,
  ): Promise<void> {
    await httpsCallable(this.functions, 'sendAnnouncement')({
      title: notification.title,
      message: notification.body,
    });
  }

  async provisionWhitelistUser(
    credentials: WhitelistCredentials,
  ): Promise<string> {
    const result = await httpsCallable<
      WhitelistCredentials,
      { readonly uid?: string }
    >(this.functions, 'createWhitelistUser')(credentials);
    if (!result.data.uid) {
      throw new Error('Whitelist provisioning did not return a user ID');
    }
    return result.data.uid;
  }

  async emailWhitelistCredentials(
    credentials: WhitelistCredentials,
  ): Promise<void> {
    await httpsCallable(this.functions, 'sendWhitelistEmail')(credentials);
  }

  async removeProvisionedUser(userId: string): Promise<void> {
    await httpsCallable(this.functions, 'removeWhitelistUser')({ userId });
  }

  async updateUserRole(userId: string, role: number): Promise<void> {
    await httpsCallable(this.functions, 'updateUserRole')({ userId, role });
  }

  async addDisciplinaryNotice(userId: string, message: string): Promise<void> {
    await httpsCallable(this.functions, 'addDisciplinaryNotice')({
      userId,
      message,
    });
  }

  async setUserBanned(userId: string, banned: boolean): Promise<void> {
    await httpsCallable(this.functions, 'setUserBanned')({ userId, banned });
  }

  async transferPresidency(userId: string): Promise<void> {
    await httpsCallable(this.functions, 'transferPresidency')({ userId });
  }

  async removeUser(userId: string): Promise<void> {
    await httpsCallable(this.functions, 'removeManagedUser')({ userId });
  }

  async deleteOwnAccount(confirmation: string): Promise<void> {
    await httpsCallable(this.functions, 'deleteOwnAccount')({ confirmation });
  }

  async syncPublicProfile(userId?: string): Promise<void> {
    await httpsCallable(this.functions, 'syncPublicProfile')(
      userId ? { userId } : {},
    );
  }

  async updatePublicProfile(profile: {
    readonly displayName: string;
    readonly bio: string;
    readonly profilePhotoUrl: string;
  }): Promise<void> {
    await httpsCallable(this.functions, 'updatePublicProfile')(profile);
  }

  async selectProfileTitle(achievementId: AchievementId | ''): Promise<void> {
    await httpsCallable(this.functions, 'selectProfileTitle')({ achievementId });
  }

  async migrateContributorPrivacy(): Promise<void> {
    await httpsCallable(this.functions, 'migrateContributorPrivacy')({});
  }

  async beginInaturalistAccountLink(): Promise<InaturalistAccountLinkAuthorization> {
    const result = await httpsCallable<
      Record<string, never>,
      InaturalistAccountLinkAuthorization
    >(this.functions, 'beginInaturalistAccountLink')({});
    return result.data;
  }

  async getInaturalistAccountLinkStatus(
    attemptId?: string,
  ): Promise<InaturalistAccountLinkStatus> {
    const result = await httpsCallable<
      { readonly attemptId?: string },
      InaturalistAccountLinkStatus
    >(this.functions, 'getInaturalistAccountLinkStatus')(
      attemptId ? { attemptId } : {},
    );
    return result.data;
  }

  async unlinkInaturalistAccount(): Promise<void> {
    await httpsCallable(this.functions, 'unlinkInaturalistAccount')({});
  }
}
