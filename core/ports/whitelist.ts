export interface WhitelistSubmission {
  readonly name: string;
  readonly graduationYear: string;
  readonly email: string;
  readonly codeWord: string;
}

export type WhitelistSubmissionResult =
  | { readonly status: 'created'; readonly id: string }
  | { readonly status: 'conflict' };

export interface WhitelistSubmissionPort {
  submit(
    application: WhitelistSubmission,
  ): Promise<WhitelistSubmissionResult>;
}
