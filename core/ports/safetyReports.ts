export type SafetyReportStatus = 'open' | 'reviewing' | 'closed';
export interface SafetyReport {
  readonly id: string;
  readonly description: string;
  readonly contentReference: string;
  readonly reporterId: string;
  readonly reporterEmail: string;
  readonly clubId: string;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
  readonly status: SafetyReportStatus;
  readonly revision: number;
  readonly lastNote: string;
  readonly notificationState: 'pending' | 'sent';
}
export interface SafetyReportCursor {
  readonly id: string;
  readonly createdAtMs: number;
}
export interface SafetyReportsGateway {
  submit(data: {
    requestId: string;
    description: string;
    contentReference: string;
  }): Promise<{ id: string }>;
  list(data: {
    status?: SafetyReportStatus;
    cursor?: SafetyReportCursor;
  }): Promise<{
    reports: readonly SafetyReport[];
    nextCursor: SafetyReportCursor | null;
  }>;
  update(data: {
    id: string;
    revision: number;
    status: SafetyReportStatus;
    note: string;
  }): Promise<SafetyReport>;
  moderate(data: {
    id: string;
    action: 'remove-chat' | 'restrict-account';
    targetId: string;
    clubId?: string;
    note: string;
  }): Promise<void>;
}
