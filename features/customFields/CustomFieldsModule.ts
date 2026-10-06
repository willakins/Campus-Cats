import { Outcome, User, failure, success } from '../../core/domain';
import {
  CustomField,
  CustomFieldValues,
  RecordKind,
  customFieldDefinitionsSchema,
  customFieldValuesSchema,
  validateCustomFieldValues,
} from '../../core/domain/customFields';
import { CustomFieldsGateway, DocumentStore } from '../../core/ports';
export class CustomFieldsModule {
  constructor(
    private readonly documents: DocumentStore,
    private readonly gateway?: CustomFieldsGateway,
  ) {}
  async load(
    kind: RecordKind,
    id?: string,
  ): Promise<
    Outcome<{ fields: readonly CustomField[]; values: CustomFieldValues }>
  > {
    try {
      const [definitions, values] = await Promise.all([
        this.documents.get('custom-field-definitions', kind),
        id
          ? this.documents.get('custom-field-values', `${kind}__${id}`)
          : undefined,
      ]);
      return success({
        fields: customFieldDefinitionsSchema.parse(
          definitions?.data.fields ?? [],
        ),
        values: customFieldValuesSchema.parse(values?.data.values ?? {}),
      });
    } catch {
      return failure('dependency_failure', 'Could not load additional fields');
    }
  }
  async saveDefinitions(
    actor: User,
    kind: RecordKind,
    fields: readonly CustomField[],
  ): Promise<Outcome<void>> {
    if (actor.role < 3)
      return failure('forbidden', 'President access required to manage fields');
    try {
      customFieldDefinitionsSchema.parse(fields);
    } catch {
      return failure(
        'validation',
        'Use unique labels and valid field options (up to 20 fields)',
      );
    }
    try {
      if (!this.gateway) throw new Error('Field service unavailable');
      await this.gateway.saveDefinitions(kind, fields);
      return success(undefined);
    } catch {
      return failure(
        'dependency_failure',
        'Could not save field definitions. Reload and retry.',
      );
    }
  }
  async saveValues(
    kind: RecordKind,
    id: string,
    fields: readonly CustomField[],
    values: CustomFieldValues,
  ): Promise<Outcome<void>> {
    try {
      validateCustomFieldValues(fields, values);
    } catch (error) {
      return failure(
        'validation',
        error instanceof Error ? error.message : 'Invalid field values',
      );
    }
    try {
      if (!this.gateway) throw new Error('Field service unavailable');
      await this.gateway.saveValues(kind, id, values);
      return success(undefined);
    } catch {
      return failure(
        'dependency_failure',
        'Could not save additional fields. Your main record is saved; retry to save these fields.',
      );
    }
  }
}
