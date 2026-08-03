import { COLLECTIONS, IdGenerator } from '../../core/domain';
import {
  DocumentStore,
  WhitelistSubmission,
  WhitelistSubmissionPort,
  WhitelistSubmissionResult,
} from '../../core/ports';

export class InMemoryWhitelistSubmission
  implements WhitelistSubmissionPort
{
  constructor(
    private readonly documents: DocumentStore,
    private readonly ids: IdGenerator,
  ) {}

  async submit(
    application: WhitelistSubmission,
  ): Promise<WhitelistSubmissionResult> {
    const documents = await this.documents.list(COLLECTIONS.whitelist);
    const duplicate = documents.some(
      ({ data }) =>
        typeof data.email === 'string' &&
        data.email.toLowerCase() === application.email.toLowerCase(),
    );
    if (duplicate) return { status: 'conflict' };
    const id = this.ids.next();
    await this.documents.put(COLLECTIONS.whitelist, id, { ...application });
    return { status: 'created', id };
  }
}
