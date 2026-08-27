import { z } from 'zod';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export const isHexColor = (value: string): boolean =>
  HEX_COLOR_PATTERN.test(value.trim());

export const hexColorSchema = z
  .string()
  .trim()
  .refine(isHexColor, 'Use a six-digit hex color such as #18314F')
  .transform((value) => value.toUpperCase());

export const donationMethodSchema = z.enum(['external', 'direct']);

const donationImageSchema = z.object({
  id: z.string().trim().min(1).max(2048),
  url: z.string().url().max(2048),
});

const secureExternalUrlSchema = z
  .string()
  .url()
  .max(2048)
  .refine((value) => /^https:\/\//i.test(value), {
    message: 'Use a secure HTTPS donation website',
  });

export const donationPageSchema = z.object({
  title: z.string().trim().max(120).default(''),
  description: z.string().trim().max(5000).default(''),
  images: z.array(donationImageSchema).max(10).default([]),
  method: donationMethodSchema.default('external'),
  externalUrl: z.union([z.literal(''), secureExternalUrlSchema]).default(''),
});

export const donationPageDraftSchema = donationPageSchema
  .omit({ images: true })
  .refine(({ title }) => title.length > 0, {
    path: ['title'],
    message: 'Donation page title is required',
  })
  .refine(({ description }) => description.length > 0, {
    path: ['description'],
    message: 'Donation page description is required',
  })
  .refine(
    ({ externalUrl, method }) =>
      method !== 'external' || externalUrl.length > 0,
    {
      path: ['externalUrl'],
      message: 'External donation website is required',
    },
  );

export type DonationPage = Readonly<z.infer<typeof donationPageSchema>>;
export type DonationPageDraft = Readonly<
  z.infer<typeof donationPageDraftSchema>
>;

export const DEFAULT_DONATION_PAGE: DonationPage = Object.freeze({
  title: '',
  description: '',
  images: [],
  method: 'external',
  externalUrl: '',
});

export const appSettingsSchema = z.object({
  logoUrl: z.union([z.literal(''), z.string().url().max(2048)]).default(''),
  primaryColor: hexColorSchema.default('#18314F'),
  accentColor: hexColorSchema.default('#B58A16'),
  sightingsAnonymous: z.boolean().default(true),
  donationPage: donationPageSchema.default(DEFAULT_DONATION_PAGE),
});

export type AppSettings = Readonly<z.infer<typeof appSettingsSchema>>;

export const DEFAULT_APP_SETTINGS: AppSettings = Object.freeze({
  logoUrl: '',
  primaryColor: '#18314F',
  accentColor: '#B58A16',
  sightingsAnonymous: true,
  donationPage: DEFAULT_DONATION_PAGE,
});

export const parseAppSettings = (value: unknown): AppSettings =>
  Object.freeze(appSettingsSchema.parse(value));

export const parseDonationPageDraft = (value: unknown): DonationPageDraft =>
  Object.freeze(donationPageDraftSchema.parse(value));

export const parseStoredAppSettings = (value: unknown): AppSettings =>
  value === undefined
    ? DEFAULT_APP_SETTINGS
    : parseAppSettings({ ...DEFAULT_APP_SETTINGS, ...(value as object) });
