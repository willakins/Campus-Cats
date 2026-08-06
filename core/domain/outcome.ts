export type OutcomeErrorCode =
  | 'validation'
  | 'authentication_failed'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'dependency_failure'
  | 'partial_failure';

export type OutcomeWarningCode =
  | 'notification_failed'
  | 'cleanup_failed'
  | 'partial_completion';

export interface OutcomeMessage<Code extends string> {
  readonly code: Code;
  readonly message: string;
}

export type Outcome<T> =
  | {
      readonly ok: true;
      readonly value: T;
      readonly warnings: readonly OutcomeMessage<OutcomeWarningCode>[];
    }
  | {
      readonly ok: false;
      readonly error: OutcomeMessage<OutcomeErrorCode>;
    };

export function success<T>(
  value: T,
  warnings: readonly OutcomeMessage<OutcomeWarningCode>[] = [],
): Outcome<T> {
  return { ok: true, value, warnings };
}

export function failure<T = never>(
  code: OutcomeErrorCode,
  message: string,
): Outcome<T> {
  return { ok: false, error: { code, message } };
}
