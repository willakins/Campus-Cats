import {
  CustomFieldValues,
  customFieldDefinitionsSchema,
  validateCustomFieldValues,
} from './customFields';
import {
  validateFieldDefinitions,
  validateFieldValues,
} from '../../functions/src/shared/customFields';
const field = {
  id: 'field_one',
  label: 'Care notes',
  type: 'text',
  options: [],
  active: true,
};
it('keeps client/server acceptance aligned for field definitions', () => {
  const cases: unknown[] = [
    [field],
    [{ ...field, id: '__proto__' }],
    [{ ...field, label: '' }],
    [{ ...field, type: 'choice', options: ['Friendly', 'Shy'] }],
    [{ ...field, type: 'choice', options: ['One'] }],
    [field, field],
    [{ ...field, label: 'Control\u0001' }],
    [{ ...field, type: 'text', options: ['Unexpected'] }],
  ];
  for (const value of cases) {
    const accepted = customFieldDefinitionsSchema.safeParse(value).success;
    if (accepted)
      expect(() => validateFieldDefinitions(value, [])).not.toThrow();
    else expect(() => validateFieldDefinitions(value, [])).toThrow();
  }
});
it('keeps typed-value acceptance aligned on both sides of the API', () => {
  const fields = customFieldDefinitionsSchema.parse([
    field,
    { ...field, id: 'number', label: 'Weight', type: 'number' },
    { ...field, id: 'bool', label: 'Follow-up', type: 'boolean' },
    {
      ...field,
      id: 'choice',
      label: 'Temperament',
      type: 'choice',
      options: ['Friendly', 'Shy'],
    },
  ]);
  const cases: CustomFieldValues[] = [
    { field_one: 'Hello', number: 4, bool: false, choice: 'Shy' },
    { number: null },
    { number: NaN },
    { bool: 'false' },
    { choice: 'Other' },
    { unknown: 'value' },
    { field_one: 'x'.repeat(1001) },
  ];
  for (const values of cases) {
    let accepted = true;
    try {
      validateCustomFieldValues(fields, values);
    } catch {
      accepted = false;
    }
    if (accepted)
      expect(() => validateFieldValues(values, fields)).not.toThrow();
    else expect(() => validateFieldValues(values, fields)).toThrow();
  }
});
