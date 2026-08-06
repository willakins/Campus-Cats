import { z } from 'zod';

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Use a six-digit hex color such as #18314F')
  .transform((value) => value.toUpperCase());

export const appSettingsSchema = z.object({
  logoUrl: z.union([z.literal(''), z.string().url().max(2048)]).default(''),
  primaryColor: hexColorSchema.default('#18314F'),
  accentColor: hexColorSchema.default('#B58A16'),
  sightingsAnonymous: z.boolean().default(true),
});

export type AppSettings = Readonly<z.infer<typeof appSettingsSchema>>;

export const DEFAULT_APP_SETTINGS: AppSettings = Object.freeze({
  logoUrl: '',
  primaryColor: '#18314F',
  accentColor: '#B58A16',
  sightingsAnonymous: true,
});

export const parseAppSettings = (value: unknown): AppSettings =>
  Object.freeze(appSettingsSchema.parse(value));

export const parseStoredAppSettings = (value: unknown): AppSettings =>
  value === undefined
    ? DEFAULT_APP_SETTINGS
    : parseAppSettings({ ...DEFAULT_APP_SETTINGS, ...(value as object) });
