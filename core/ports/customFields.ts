import {
  CustomField,
  CustomFieldValues,
  RecordKind,
} from '../domain/customFields';
export interface CustomFieldsGateway {
  saveDefinitions(
    kind: RecordKind,
    fields: readonly CustomField[],
  ): Promise<void>;
  saveValues(
    kind: RecordKind,
    recordId: string,
    values: CustomFieldValues,
  ): Promise<void>;
}
