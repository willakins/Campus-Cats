import { Functions, httpsCallable } from 'firebase/functions';

import {
  WhitelistSubmission,
  WhitelistSubmissionPort,
  WhitelistSubmissionResult,
} from '../../core/ports';

export class FirebaseWhitelistSubmission implements WhitelistSubmissionPort {
  constructor(private readonly functions: Functions) {}

  async submit(
    application: WhitelistSubmission,
  ): Promise<WhitelistSubmissionResult> {
    const result = await httpsCallable<
      WhitelistSubmission,
      WhitelistSubmissionResult
    >(this.functions, 'submitWhitelistApplication')(application);
    return result.data;
  }
}
