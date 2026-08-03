import { Functions, httpsCallable } from 'firebase/functions';

import {
  AnnouncementNotification,
  CallableEffects,
  WhitelistCredentials,
} from '../../core/ports';

export class FirebaseCallableEffects implements CallableEffects {
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
}
