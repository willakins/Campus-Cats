import { z } from 'zod';

// Free text is rendered as React text, never HTML. Preserve Unicode and markup
// as text; reject non-printing controls instead of stripping user content.
export const plainText = z.string().regex(
  // eslint-disable-next-line no-control-regex -- Reject non-printing input controls.
  /^[^\x00-\x08\x0B\x0C\x0E-\x1F\x7F]*$/u,
  'Text contains unsupported control characters',
);

export const httpUrlSchema = z
  .string()
  .max(2048)
  .refine((value) => {
    // eslint-disable-next-line no-control-regex -- Reject non-printing input controls.
    if (/\s|[\x00-\x1F\x7F\\]/u.test(value)) return false;
    try {
      const url = new URL(value);
      return (
        (url.protocol === 'http:' || url.protocol === 'https:') &&
        Boolean(url.hostname) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, 'Expected an HTTP or HTTPS URL without credentials');

export const httpsUrlSchema = httpUrlSchema.refine(
  (value) => value.startsWith('https://'),
  'Expected a secure HTTPS URL',
);
