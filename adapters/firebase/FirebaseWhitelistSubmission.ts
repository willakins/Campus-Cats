import { Functions, httpsCallable } from 'firebase/functions';

import {
  WhitelistSubmission,
  WhitelistSubmissionPort,
  WhitelistSubmissionResult,
} from '../../core/ports';
import { FirebaseTenantScope } from './FirebaseTenantScope';

export class FirebaseWhitelistSubmission implements WhitelistSubmissionPort {
  constructor(
    private readonly functions: Functions,
    private readonly tenantScope: FirebaseTenantScope,
  ) {}

  async submit(
    application: WhitelistSubmission,
  ): Promise<WhitelistSubmissionResult> {
    const result = await httpsCallable<
      WhitelistSubmission & { readonly clubId: string },
      WhitelistSubmissionResult
    >(this.functions, 'submitWhitelistApplication')({
      ...application,
      clubId: this.tenantScope.clubId,
    });
    return result.data;
  }
}
