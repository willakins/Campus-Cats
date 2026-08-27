import {
  CATALOG_TAG_SETTINGS_DOCUMENT_ID,
  COLLECTIONS,
  CatalogTag,
  CatalogTagAssignment,
  CatalogTagSettings,
  DEFAULT_CATALOG_TAGS,
  IdGenerator,
  Outcome,
  PersistenceCodec,
  User,
  canAccessRolePolicy,
  failure,
  parseCatalogTag,
  parseCatalogTagAssignment,
  parseCatalogTagSettings,
  success,
  roleAccessPolicies,
  roleAccessRequirement,
} from '../../core/domain';
import { DocumentStore } from '../../core/ports';

interface CatalogTagsDependencies {
  readonly documents: DocumentStore;
  readonly ids: IdGenerator;
  readonly codecs: {
    readonly catalogTagSettings: PersistenceCodec<CatalogTagSettings>;
    readonly catalogTagAssignment: PersistenceCodec<CatalogTagAssignment>;
  };
}

export class CatalogTagsModule {
  constructor(private readonly dependencies: CatalogTagsDependencies) {}

  async list(actor: User | undefined): Promise<Outcome<readonly CatalogTag[]>> {
    if (!actor) return failure('unauthenticated', 'Sign in to view catalog tags');
    try {
      return success(await this.load());
    } catch {
      return failure('dependency_failure', 'Could not load catalog tags');
    }
  }

  async create(
    actor: User | undefined,
    label: string,
  ): Promise<Outcome<CatalogTag>> {
    const denied = mutationDenied(actor);
    if (denied) return denied;
    try {
      const tag = parseCatalogTag({ id: this.dependencies.ids.next(), label });
      const tags = [...await this.load(), tag];
      await this.persist(tags);
      return success(tag);
    } catch (error) {
      return mutationFailure(error, 'create');
    }
  }

  async update(
    actor: User | undefined,
    id: string,
    label: string,
  ): Promise<Outcome<CatalogTag>> {
    const denied = mutationDenied(actor);
    if (denied) return denied;
    try {
      const current = await this.load();
      if (!current.some((tag) => tag.id === id)) {
        return failure('not_found', 'Catalog tag not found');
      }
      const updated = parseCatalogTag({ id, label });
      await this.persist(
        current.map((tag) => (tag.id === id ? updated : tag)),
      );
      return success(updated);
    } catch (error) {
      return mutationFailure(error, 'update');
    }
  }

  async remove(actor: User | undefined, id: string): Promise<Outcome<void>> {
    const denied = mutationDenied(actor);
    if (denied) return denied;
    try {
      const current = await this.load();
      if (!current.some((tag) => tag.id === id)) {
        return failure('not_found', 'Catalog tag not found');
      }
      const settings = parseCatalogTagSettings({
        tags: current.filter((tag) => tag.id !== id),
      });
      const assignments = await this.loadAssignments();
      await this.dependencies.documents.commit([
        {
          operation: 'put',
          collection: COLLECTIONS.catalogTagSettings,
          id: CATALOG_TAG_SETTINGS_DOCUMENT_ID,
          data: this.dependencies.codecs.catalogTagSettings.encode(settings),
        },
        ...assignments
          .filter((assignment) =>
            assignment.tagIds.some((tagId) => tagId === id),
          )
          .map((assignment) => ({
            operation: 'put' as const,
            collection: COLLECTIONS.catalogTagAssignments,
            id: assignment.catalogId,
            data: this.dependencies.codecs.catalogTagAssignment.encode(
              parseCatalogTagAssignment({
                ...assignment,
                tagIds: assignment.tagIds.filter((tagId) => tagId !== id),
              }),
            ),
          })),
      ]);
      return success(undefined);
    } catch {
      return failure('dependency_failure', 'Could not delete the catalog tag');
    }
  }

  async assignments(
    actor: User | undefined,
  ): Promise<Outcome<readonly CatalogTagAssignment[]>> {
    if (!actor) {
      return failure('unauthenticated', 'Sign in to view catalog tag assignments');
    }
    try {
      return success(await this.loadAssignments());
    } catch {
      return failure(
        'dependency_failure',
        'Could not load catalog tag assignments',
      );
    }
  }

  async assign(
    actor: User | undefined,
    catalogId: string,
    tagIds: readonly string[],
  ): Promise<Outcome<CatalogTagAssignment>> {
    const denied = mutationDenied(actor);
    if (denied) return denied;
    try {
      const configuredIds = new Set<string>(
        (await this.load()).map(({ id }) => id),
      );
      if (tagIds.some((id) => !configuredIds.has(id))) {
        return failure('validation', 'Choose configured catalog tags');
      }
      const assignment = parseCatalogTagAssignment({ catalogId, tagIds });
      await this.dependencies.documents.put(
        COLLECTIONS.catalogTagAssignments,
        assignment.catalogId,
        this.dependencies.codecs.catalogTagAssignment.encode(assignment),
      );
      return success(assignment);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return failure('validation', 'Choose valid catalog tags');
      }
      return failure(
        'dependency_failure',
        'Could not update catalog tag assignments',
      );
    }
  }

  private async load(): Promise<readonly CatalogTag[]> {
    const document = await this.dependencies.documents.get(
      COLLECTIONS.catalogTagSettings,
      CATALOG_TAG_SETTINGS_DOCUMENT_ID,
    );
    return document
      ? this.dependencies.codecs.catalogTagSettings.decode(
          document.id,
          document.data,
        ).tags
      : DEFAULT_CATALOG_TAGS;
  }

  private async persist(tags: readonly CatalogTag[]): Promise<void> {
    const settings = parseCatalogTagSettings({ tags });
    await this.dependencies.documents.put(
      COLLECTIONS.catalogTagSettings,
      CATALOG_TAG_SETTINGS_DOCUMENT_ID,
      this.dependencies.codecs.catalogTagSettings.encode(settings),
    );
  }

  private async loadAssignments(): Promise<readonly CatalogTagAssignment[]> {
    const documents = await this.dependencies.documents.list(
      COLLECTIONS.catalogTagAssignments,
    );
    return documents.map(({ id, data }) =>
      this.dependencies.codecs.catalogTagAssignment.decode(id, data),
    );
  }
}

function mutationDenied(actor: User | undefined): Outcome<never> | undefined {
  if (!actor) return failure('unauthenticated', 'Sign in to manage catalog tags');
  if (!canAccessRolePolicy(actor.role, roleAccessPolicies.manageCatalogTags)) {
    return failure(
      'forbidden',
      roleAccessRequirement(roleAccessPolicies.manageCatalogTags),
    );
  }
  return undefined;
}

function mutationFailure(
  error: unknown,
  operation: 'create' | 'update',
): Outcome<never> {
  if (error instanceof Error && error.name === 'ZodError') {
    return failure('validation', 'Enter a unique catalog tag name');
  }
  return failure(
    'dependency_failure',
    operation === 'create'
      ? 'Could not create the catalog tag'
      : 'Could not update the catalog tag',
  );
}
