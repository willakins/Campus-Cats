import { z } from 'zod';
import { plainText } from './inputValidation';

export const recordKindSchema = z.enum(['catalog', 'sighting', 'station']);
export const customFieldSchema = z
  .object({
    id: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,80}$/)
      .refine(
        (id) => !['__proto__', 'constructor', 'prototype'].includes(id),
        'Invalid field ID',
      ),
    label: plainText.trim().min(1).max(80),
    type: z.enum(['text', 'number', 'boolean', 'choice']),
    options: z.array(plainText.trim().min(1).max(80)).max(20).default([]),
    active: z.boolean().default(true),
  })
  .superRefine((field, context) => {
    if (
      (field.type === 'choice' && field.options.length < 2) ||
      (field.type !== 'choice' && field.options.length) ||
      new Set(field.options).size !== field.options.length
    )
      context.addIssue({
        code: 'custom',
        message:
          'Choice fields need 2–20 unique options; other fields have no options',
      });
  });
export const customFieldDefinitionsSchema = z
  .array(customFieldSchema)
  .max(20)
  .superRefine((fields, context) => {
    if (
      new Set(fields.map(({ id }) => id)).size !== fields.length ||
      new Set(fields.map(({ label }) => label.toLowerCase())).size !==
        fields.length
    )
      context.addIssue({
        code: 'custom',
        message: 'Field IDs and labels must be unique',
      });
  });
export const customFieldValuesSchema = z
  .record(
    z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
    z.union([plainText.max(1000), z.number().finite(), z.boolean(), z.null()]),
  )
  .refine((value) => Object.keys(value).length <= 20, 'At most 20 fields');
export type RecordKind = z.infer<typeof recordKindSchema>;
export type CustomField = z.infer<typeof customFieldSchema>;
export type CustomFieldValues = z.infer<typeof customFieldValuesSchema>;
export function validateCustomFieldValues(
  fields: readonly CustomField[],
  values: CustomFieldValues,
): void {
  customFieldValuesSchema.parse(values);
  for (const [id, value] of Object.entries(values)) {
    const field = fields.find((field) => field.id === id && field.active);
    if (!field) throw new Error('Unknown or archived field');
    if (value === null) continue;
    if (
      (field.type === 'choice' &&
        (typeof value !== 'string' || !field.options.includes(value))) ||
      (field.type !== 'choice' &&
        typeof value !== (field.type === 'text' ? 'string' : field.type))
    )
      throw new Error(`Enter a valid value for ${field.label}`);
  }
}
