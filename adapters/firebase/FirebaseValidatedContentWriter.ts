import { Timestamp } from 'firebase/firestore';
import { Functions, httpsCallable } from 'firebase/functions';
import { DocumentData, DocumentWrite } from '../../core/ports';

export class FirebaseValidatedContentWriter {
  constructor(private readonly functions: Functions) {}

  async createContest(
    clubId: string,
    id: string,
    data: DocumentData,
  ): Promise<void> {
    if (
      !(data.votingStartsAt instanceof Timestamp) ||
      !(data.votingEndsAt instanceof Timestamp)
    ) {
      throw new Error('Contest dates are invalid');
    }
    await httpsCallable(
      this.functions,
      'createContest',
    )({
      clubId,
      id,
      title: data.title,
      details: data.details,
      participationAudience: data.participationAudience ?? 'all_members',
      options: data.options,
      durationMillis:
        data.votingEndsAt.toMillis() - data.votingStartsAt.toMillis(),
    });
  }

  async saveTags(
    clubId: string,
    tags: unknown,
    writes: readonly DocumentWrite[] = [],
  ): Promise<void> {
    const assignments = writes.map((write) => {
      if (
        write.operation !== 'put' ||
        write.collection !== `clubs/${clubId}/catalog-tag-assignments`
      ) {
        throw new Error('Catalog tag changes must stay in the same club');
      }
      return { catalogId: write.id, tagIds: write.data.tagIds };
    });
    await httpsCallable(
      this.functions,
      'saveCatalogTags',
    )({ clubId, tags, assignments });
  }

  async createSurvey(
    clubId: string,
    id: string,
    data: DocumentData,
  ): Promise<void> {
    await httpsCallable(
      this.functions,
      'createSurvey',
    )({
      clubId,
      id,
      title: data.title,
      details: data.details,
      anonymous: data.anonymous,
      participationAudience: data.participationAudience ?? 'all_members',
      questions: data.questions,
    });
  }
}
