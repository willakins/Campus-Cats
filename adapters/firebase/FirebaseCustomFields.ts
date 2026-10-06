import { Functions, httpsCallable } from 'firebase/functions';
import { CustomFieldsGateway } from '../../core/ports';
import {
  CustomField,
  CustomFieldValues,
  RecordKind,
} from '../../core/domain/customFields';
import { FirebaseTenantScope } from './FirebaseTenantScope';
export class FirebaseCustomFields implements CustomFieldsGateway {
  constructor(
    private readonly functions: Functions,
    private readonly tenant: FirebaseTenantScope,
  ) {}
  async saveDefinitions(kind: RecordKind, fields: readonly CustomField[]) {
    await httpsCallable(
      this.functions,
      'saveCustomFieldDefinitions',
    )({ clubId: this.tenant.clubId, kind, fields });
  }
  async saveValues(
    kind: RecordKind,
    recordId: string,
    values: CustomFieldValues,
  ) {
    await httpsCallable(
      this.functions,
      'saveCustomFieldValues',
    )({ clubId: this.tenant.clubId, kind, recordId, values });
  }
}
