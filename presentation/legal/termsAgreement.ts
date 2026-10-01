import { PLATFORM_INFO } from '@/config/platformInfo';

export const LEGAL_EFFECTIVE_DATE = 'August 28, 2026';
export const LEGAL_TERMS_VERSION = '2026-08-28';
export const LEGAL_CONTACT_EMAIL = PLATFORM_INFO.supportEmail;

export const hasAgreedToCurrentTerms = (account: {
  readonly agreedToTerms?: boolean;
  readonly termsVersion?: string;
}): boolean =>
  account.agreedToTerms === true &&
  account.termsVersion === LEGAL_TERMS_VERSION;
