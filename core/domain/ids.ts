import { z } from 'zod';

const nonEmptyId = z.string().trim().min(1);

export const userIdSchema = nonEmptyId.brand<'UserId'>();
export const sightingIdSchema = nonEmptyId.brand<'SightingId'>();
export const catalogEntryIdSchema = nonEmptyId.brand<'CatalogEntryId'>();
export const stationIdSchema = nonEmptyId.brand<'StationId'>();
export const announcementIdSchema = nonEmptyId.brand<'AnnouncementId'>();
export const whitelistApplicationIdSchema =
  nonEmptyId.brand<'WhitelistApplicationId'>();
export const contactIdSchema = nonEmptyId.brand<'ContactId'>();

export type UserId = z.infer<typeof userIdSchema>;
export type SightingId = z.infer<typeof sightingIdSchema>;
export type CatalogEntryId = z.infer<typeof catalogEntryIdSchema>;
export type StationId = z.infer<typeof stationIdSchema>;
export type AnnouncementId = z.infer<typeof announcementIdSchema>;
export type WhitelistApplicationId = z.infer<
  typeof whitelistApplicationIdSchema
>;
export type ContactId = z.infer<typeof contactIdSchema>;
