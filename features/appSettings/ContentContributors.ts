import {
  AppSettings,
  COLLECTIONS,
  ContentContributor,
  ContributionKind,
  PersistenceCodec,
  User,
  canViewContributors,
  contributorDocumentId,
} from '../../core/domain';
import {
  AppSettingsReader,
  DocumentStore,
  DocumentWrite,
} from '../../core/ports';

interface ContentContributorsDependencies {
  readonly documents: DocumentStore;
  readonly settings: AppSettingsReader;
  readonly codec: PersistenceCodec<ContentContributor>;
}

export class ContentContributors {
  constructor(private readonly dependencies: ContentContributorsDependencies) {}

  async visibleByContentId(
    actor: User | undefined,
    kind: ContributionKind,
  ): Promise<ReadonlyMap<string, User>> {
    if (!(await this.canView(actor))) return new Map();
    const documents = await this.dependencies.documents.list(
      COLLECTIONS.contentContributors,
    );
    return new Map(
      documents
        .map(({ id, data }) => this.dependencies.codec.decode(id, data))
        .filter((contributor) => contributor.kind === kind)
        .map((contributor) => [contributor.contentId, contributor.user]),
    );
  }

  async visibleForContent(
    actor: User | undefined,
    kind: ContributionKind,
    contentId: string,
  ): Promise<User | undefined> {
    if (!actor) return undefined;
    const canView = await this.canView(actor);
    let document;
    try {
      document = await this.dependencies.documents.get(
        COLLECTIONS.contentContributors,
        contributorDocumentId(kind, contentId),
      );
    } catch (error) {
      if (!canView) return undefined;
      throw error;
    }
    if (!document) return undefined;
    const contributor = this.dependencies.codec.decode(document.id, document.data);
    if (contributor.kind !== kind || contributor.contentId !== contentId) {
      return undefined;
    }
    return canView || contributor.user.id === actor.id
      ? contributor.user
      : undefined;
  }

  async contentIdsForUser(
    actor: User | undefined,
    kind: ContributionKind,
    userId: string,
  ): Promise<readonly string[]> {
    if (!actor) return [];
    if (actor.id !== userId && !(await this.canView(actor))) return [];
    const documents = await this.dependencies.documents.listWhereEqual(
      COLLECTIONS.contentContributors,
      'user.id',
      userId,
    );
    return documents
      .map(({ id, data }) => this.dependencies.codec.decode(id, data))
      .filter((contributor) => contributor.kind === kind)
      .map(({ contentId }) => contentId);
  }

  write(
    kind: ContributionKind,
    contentId: string,
    user: User,
  ): DocumentWrite {
    const contributor: ContentContributor = { kind, contentId, user };
    return {
      operation: 'put',
      collection: COLLECTIONS.contentContributors,
      id: contributorDocumentId(kind, contentId),
      data: this.dependencies.codec.encode(contributor),
    };
  }

  remove(kind: ContributionKind, contentId: string): DocumentWrite {
    return {
      operation: 'remove',
      collection: COLLECTIONS.contentContributors,
      id: contributorDocumentId(kind, contentId),
    };
  }

  async canView(actor: User | undefined): Promise<boolean> {
    if (!actor) return false;
    const settings: AppSettings = await this.dependencies.settings.getSettings();
    return canViewContributors(actor.role, settings.sightingsAnonymous);
  }
}
