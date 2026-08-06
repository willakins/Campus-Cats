import {
  COLLECTIONS,
  Contact,
  PersistenceCodec,
  IdGenerator,
  Outcome,
  User,
  canManageFeature,
  failure,
  parseContact,
  success,
} from '../../core/domain';
import { DocumentStore } from '../../core/ports';

export interface ContactDraft {
  readonly name: string;
  readonly email: string;
}

interface ContactsDependencies {
  readonly documents: DocumentStore;
  readonly ids: IdGenerator;
  readonly codecs: { readonly contact: PersistenceCodec<Contact> };
}

export class ContactsModule {
  constructor(private readonly dependencies: ContactsDependencies) {}

  async list(actor: User | undefined): Promise<Outcome<readonly Contact[]>> {
    if (!actor) return failure('unauthenticated', 'Sign in to view contacts');
    let documents;
    try {
      documents = await this.dependencies.documents.list(COLLECTIONS.contacts);
    } catch {
      return failure('dependency_failure', 'Could not load contact information');
    }

    const contacts: Contact[] = [];
    for (const { id, data } of documents) {
      try {
        contacts.push(this.dependencies.codecs.contact.decode(id, data));
      } catch (error) {
        console.warn(
          `[contacts] Ignoring invalid contact document: ${id}`,
          error instanceof Error ? error.message : error,
        );
      }
    }
    return success(contacts);
  }

  async create(
    actor: User | undefined,
    draft: ContactDraft,
  ): Promise<Outcome<Contact>> {
    const denied = mutationDenied(actor);
    if (denied) return denied;
    const contact = parseDraft(this.dependencies.ids.next(), draft);
    if (!contact.ok) return contact;
    try {
      await this.dependencies.documents.put(
        COLLECTIONS.contacts,
        contact.value.id,
        this.dependencies.codecs.contact.encode(contact.value),
      );
      return contact;
    } catch {
      return failure('dependency_failure', 'Could not create the contact');
    }
  }

  async update(
    actor: User | undefined,
    id: string,
    draft: ContactDraft,
  ): Promise<Outcome<Contact>> {
    const denied = mutationDenied(actor);
    if (denied) return denied;
    const existing = await this.get(id);
    if (!existing.ok) return existing;
    const contact = parseDraft(id, draft);
    if (!contact.ok) return contact;
    try {
      await this.dependencies.documents.put(
        COLLECTIONS.contacts,
        id,
        this.dependencies.codecs.contact.encode(contact.value),
      );
      return contact;
    } catch {
      return failure('dependency_failure', 'Could not update the contact');
    }
  }

  async remove(actor: User | undefined, id: string): Promise<Outcome<void>> {
    const denied = mutationDenied(actor);
    if (denied) return denied;
    const existing = await this.get(id);
    if (!existing.ok) return existing;
    try {
      await this.dependencies.documents.remove(COLLECTIONS.contacts, id);
      return success(undefined);
    } catch {
      return failure('dependency_failure', 'Could not delete the contact');
    }
  }

  private async get(id: string): Promise<Outcome<Contact>> {
    try {
      const document = await this.dependencies.documents.get(COLLECTIONS.contacts, id);
      return document
        ? success(this.dependencies.codecs.contact.decode(document.id, document.data))
        : failure('not_found', 'Contact not found');
    } catch {
      return failure('dependency_failure', 'Could not load the contact');
    }
  }
}

function mutationDenied(actor: User | undefined): Outcome<never> | undefined {
  if (!actor) return failure('unauthenticated', 'Sign in to manage contacts');
  if (!canManageFeature(actor.role)) {
    return failure('forbidden', 'Only officers may manage contacts');
  }
  return undefined;
}

function parseDraft(id: string, draft: ContactDraft): Outcome<Contact> {
  try {
    return success(parseContact({ id, ...draft }));
  } catch {
    return failure('validation', 'Enter a contact name and valid email address');
  }
}
