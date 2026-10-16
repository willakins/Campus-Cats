import { PLATFORM_INFO } from '@/config/platformInfo';
import { LegalDocument } from './legalDocuments';

export const childSafetyStandards: LegalDocument = {
  title: 'Child Safety Standards',
  effectiveDate: 'October 16, 2026',
  summary:
    'Campus Cats prohibits child sexual abuse and exploitation (CSAE). These standards apply to every user, club, and type of content on Campus Cats.',
  sections: [
    {
      title: 'Prohibited conduct and content',
      paragraphs: [
        'Do not create, upload, share, request, promote, or distribute child sexual abuse material (CSAM). Sexual exploitation of anyone under 18 is prohibited, including grooming, sexual solicitation, sextortion, trafficking, and sexualized depictions of children. Attempts to use Campus Cats to facilitate this conduct elsewhere are also prohibited.',
      ],
    },
    {
      title: 'Report a concern',
      paragraphs: [
        'In Campus Cats, open More → Report a safety concern. You can also open the reporting page from any legal page, including before sign-in. Signed-in users can submit a text report and receive a case reference. If you cannot use the form, contact the safety team by email.',
        `Safety contact: ${PLATFORM_INFO.supportEmail}. Include where the content or account can be found and a brief description. Do not download, attach, copy, or forward sexual images of children. You do not need to determine whether a violation occurred before reporting a concern.`,
        'If someone is in immediate danger, contact local emergency services. Campus Cats reporting is not an emergency service.',
      ],
    },
    {
      title: 'Review and action',
      paragraphs: [
        'Our safety process requires reviewing reports, removing or disabling access to confirmed CSAM, and taking action against accounts involved in child sexual abuse or exploitation. Actions can include content removal, account restrictions, and termination. We may also act on credible safety concerns while a review is ongoing.',
        'We report confirmed CSAM to the National Center for Missing & Exploited Children (NCMEC) or the relevant regional authority as required by applicable law, and cooperate with lawful requests. Relevant information is preserved and disclosed only as appropriate for legal and safety obligations.',
      ],
    },
    {
      title: 'Privacy and contact',
      paragraphs: [
        'Reports are handled privately by designated platform administrators and authorized infrastructure operators. Ordinary club membership or officer status does not grant access to reports. Reports may include your account identity and may be retained separately for investigation or legal obligations, as described in our Privacy Policy.',
        `The Campus Cats child safety point of contact is ${PLATFORM_INFO.supportEmail}. Contact this address for safety concerns, follow-up using your case reference, or questions about these standards.`,
      ],
    },
  ],
};
