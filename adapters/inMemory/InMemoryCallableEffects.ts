import {
  AnnouncementNotification,
  CallableEffects,
  WhitelistCredentials,
} from '../../core/ports';

type Operation =
  | 'notifyAnnouncement'
  | 'provisionWhitelistUser'
  | 'emailWhitelistCredentials'
  | 'removeProvisionedUser'
  | 'updateUserRole'
  | 'removeUser';

export class InMemoryCallableEffects implements CallableEffects {
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

  async removeUser(userId: string): Promise<void> {
    this.maybeFail('removeUser');
    this.operations.push(`remove-user:${userId}`);
  }

  private maybeFail(operation: Operation): void {
    const failure = this.#failures.get(operation);
    if (failure) {
      this.#failures.delete(operation);
      throw failure;
    }
  }
}
