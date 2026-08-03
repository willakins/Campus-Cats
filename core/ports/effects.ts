export interface AnnouncementNotification {
  readonly title: string;
  readonly body: string;
}

export interface WhitelistCredentials {
  readonly email: string;
  readonly password: string;
}

export interface CallableEffects {
  notifyAnnouncement(notification: AnnouncementNotification): Promise<void>;
  provisionWhitelistUser(credentials: WhitelistCredentials): Promise<string>;
  emailWhitelistCredentials(credentials: WhitelistCredentials): Promise<void>;
  removeProvisionedUser(userId: string): Promise<void>;
  updateUserRole(userId: string, role: number): Promise<void>;
  removeUser(userId: string): Promise<void>;
}
