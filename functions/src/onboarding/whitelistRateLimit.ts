import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { HandlerError } from '../shared/handlers';

const HOUR = 60 * 60 * 1000;
const limits = { perIp: 100, perEmail: 3 };

export class FirebaseWhitelistRateLimiter {
  constructor(
    private readonly firestore: Firestore,
    private readonly now: () => Date = () => new Date(),
    private readonly policy = limits,
  ) {}

  async consume(clientIp: string | undefined, email: string): Promise<void> {
    const time = this.now().getTime();
    // Use only the server request context, never an address in the JSON payload.
    // Canonicalize equivalent IPv6 and IPv4-mapped representations to one key.
    const kind = isIP(clientIp ?? '');
    const address = kind
      ? new URL(`http://[${kind === 4 ? `::ffff:${clientIp}` : clientIp}]/`)
          .hostname
      : 'unknown';
    const keys = [
      { key: `ip:${address}`, limit: this.policy.perIp },
      {
        key: `email:${email.trim().toLowerCase()}`,
        limit: this.policy.perEmail,
      },
    ].map(({ key, limit }) => ({
      reference: this.firestore
        .collection('whitelist-rate-limits')
        .doc(createHash('sha256').update(key).digest('hex')),
      limit,
    }));
    await this.firestore.runTransaction(async (transaction) => {
      const snapshots = await transaction.getAll(
        ...keys.map(({ reference }) => reference),
      );
      const updates = snapshots.map((snapshot, index) => {
        const data = snapshot.data();
        if (
          data &&
          (!(data.windowStartedAt instanceof Timestamp) ||
            !Number.isInteger(data.count) ||
            data.count < 0)
        ) {
          throw new HandlerError(
            'internal',
            'Application limits could not be checked',
          );
        }
        const expired = !data || time >= data.windowStartedAt.toMillis() + HOUR;
        const count = expired ? 0 : data!.count;
        if (count >= keys[index].limit) {
          throw new HandlerError(
            'resource-exhausted',
            'Too many membership applications. Please try again in an hour.',
          );
        }
        return {
          count: count + 1,
          windowStartedAt: expired
            ? Timestamp.fromMillis(time)
            : data!.windowStartedAt,
          expiresAt: Timestamp.fromMillis(time + 24 * HOUR),
        };
      });
      // Both quotas are consumed atomically; concurrent instances cannot pass
      // the limit by reading the same old count.
      updates.forEach((data, index) =>
        transaction.set(keys[index].reference, data),
      );
    });
  }
}
