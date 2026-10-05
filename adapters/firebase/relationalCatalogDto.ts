import { z } from 'zod';
import {
  catSchema,
  parseCatalogEntry,
  localCatalogRecord,
  externalMediaAssetSchema,
} from '../../core/domain';
import type { CatalogRecord } from '../../core/domain';
import { mediaAssetId, type DisplayMediaAsset } from '../../core/ports';

export const relationalDate = z
  .string()
  .refine((value) => Number.isFinite(Date.parse(value)));
const optionalText = z.string().nullable();
export const catalogRecordSchema = z.object({
  id: z.string().min(1),
  source: z.enum(['campus-cats', 'inaturalist']),
  source_id: z.number().int().positive().nullable(),
  name: z.string(),
  description_short: z.string(),
  description_long: z.string(),
  color_pattern: optionalText,
  behavior: optionalText,
  years_recorded: optionalText,
  area_of_residence: optionalText,
  current_status: catSchema.shape.currentStatus.nullable(),
  fur_length: catSchema.shape.furLength.nullable(),
  fur_pattern: optionalText,
  tnr: catSchema.shape.tnr.nullable(),
  sex: catSchema.shape.sex.nullable(),
  credits: z.string(),
  created_at: relationalDate.nullable(),
  source_url: optionalText,
  source_updated_at: relationalDate.nullable(),
  linked_local_catalog_id: optionalText,
  match_status: z.enum(['unlinked', 'linked', 'ambiguous']).nullable(),
  source_active: z.boolean(),
  visible: z.boolean(),
  local_created_at: relationalDate.nullable(),
  local_credits: optionalText,
});

export function catalogRecord(
  row: z.infer<typeof catalogRecordSchema>,
): CatalogRecord {
  const cat = Object.fromEntries(
    Object.entries({
      name: row.name,
      descShort: row.description_short,
      descLong: row.description_long,
      colorPattern: row.color_pattern,
      behavior: row.behavior,
      yearsRecorded: row.years_recorded,
      AoR: row.area_of_residence,
      currentStatus: row.current_status,
      furLength: row.fur_length,
      furPattern: row.fur_pattern,
      tnr: row.tnr,
      sex: row.sex,
    }).filter(([, value]) => value !== null),
  );
  if (row.source === 'campus-cats') {
    return localCatalogRecord(
      parseCatalogEntry({
        id: row.id,
        cat,
        credits: row.credits,
        createdAt: row.created_at ? new Date(row.created_at) : undefined,
      }),
    );
  }
  if (
    !row.source_id ||
    !row.source_url ||
    !row.source_updated_at ||
    !row.match_status
  )
    throw new Error('Incomplete imported catalog record');
  return {
    source: 'inaturalist',
    id: row.id,
    sourceId: row.source_id,
    cat: cat as CatalogRecord['cat'],
    credits: row.credits,
    sourceUrl: row.source_url,
    sourceUpdatedAt: new Date(row.source_updated_at),
    linkedLocalCatalogId: row.linked_local_catalog_id ?? undefined,
    matchStatus: row.match_status,
    sourceActive: row.source_active,
    visible: row.visible,
    moderation: { hidden: !row.visible, reason: '' },
    ...(row.linked_local_catalog_id && row.local_created_at
      ? {
          localContribution: {
            createdAt: new Date(row.local_created_at),
            credits: row.local_credits ?? '',
          },
        }
      : {}),
  };
}

export const catalogMediaSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['firebase', 'external']),
  url: z.string().url(),
  role: z.enum(['profile', 'gallery']),
  metadata: z.record(z.string(), z.unknown()),
});

export function catalogMedia(
  row: z.infer<typeof catalogMediaSchema>,
): DisplayMediaAsset {
  if (row.kind === 'external')
    return externalMediaAssetSchema.parse({
      ...row.metadata,
      kind: 'external',
      id: mediaAssetId(row.id),
      url: row.url,
      role: row.role,
    });
  return { id: mediaAssetId(row.id), url: row.url, role: row.role };
}
