import { HandlerError, Role } from './handlers';

export type StoredParticipationAudience =
  | 'all_members'
  | 'officers_only';

export function parseParticipationAudience(
  value: unknown,
): StoredParticipationAudience {
  if (value === undefined || value === 'all_members') return 'all_members';
  if (value === 'officers_only') return 'officers_only';
  throw new HandlerError('internal', 'Stored participation audience is invalid');
}

export function assertCanParticipate(
  audienceValue: unknown,
  role: Role,
  subject: 'survey' | 'vote',
): void {
  const audience = parseParticipationAudience(audienceValue);
  if (audience === 'officers_only' && role < 1) {
    throw new HandlerError(
      'permission-denied',
      `Only officers can participate in this ${subject}`,
    );
  }
}
