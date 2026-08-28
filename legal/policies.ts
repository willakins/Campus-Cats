export const LEGAL_EFFECTIVE_DATE = 'August 28, 2026';
export const LEGAL_TERMS_VERSION = '2026-08-28';
export const LEGAL_CONTACT_EMAIL = 'willakins23@gmail.com';

export const hasAgreedToCurrentTerms = (account: {
  readonly agreedToTerms?: boolean;
  readonly termsVersion?: string;
}): boolean =>
  account.agreedToTerms === true &&
  account.termsVersion === LEGAL_TERMS_VERSION;

export interface LegalSection {
  readonly title: string;
  readonly paragraphs?: readonly string[];
  readonly bullets?: readonly string[];
}

export interface LegalDocument {
  readonly title: string;
  readonly summary: string;
  readonly sections: readonly LegalSection[];
}

export const privacyPolicy: LegalDocument = {
  title: 'Privacy Policy',
  summary:
    'This Privacy Policy explains how Campus Cats collects, uses, discloses, and protects personal information when you use our mobile applications, hosted pages, and related services (the “Service”).',
  sections: [
    {
      title: '1. Who we are and scope',
      paragraphs: [
        'Campus Cats operates a multi-club platform for university communities that care for community cats. Each participating club administers its own membership and club content. This Policy applies to information Campus Cats processes through the Service; it does not govern a university, club, donation site, iNaturalist, or other third party when that party processes information under its own practices.',
        'Campus Cats is based in Atlanta, Georgia, United States. Questions and privacy requests may be sent to willakins23@gmail.com.',
      ],
    },
    {
      title: '2. Information we collect',
      bullets: [
        'Account and membership information, including your email address, club, role, authentication identifiers, account status, push-notification token, and moderation history.',
        'Profile information you choose to provide, including display name, biography, profile photo, achievements, and displayed title.',
        'Precise location and field-report information, including the coordinates, date, time, health and feeding details, notes, and photos you submit for cat sightings or feeding stations. Device location is accessed only with operating-system permission.',
        'Community content, including chat messages and reactions, comments, announcements, events, surveys, nominations, ballots, read status, and other material you submit or administer.',
        'Access-request and club-setup information, including name, email, graduation year, optional security word, university, club branding, and President verification information.',
        'Billing and transaction information for club administrators, including billing email, subscription state, usage totals, invoices, and provider identifiers. Stripe processes payment-card and billing-address details; Campus Cats does not store full payment-card numbers.',
        'Integration information, including a linked iNaturalist numeric user ID and public profile metadata. Campus Cats does not store your iNaturalist password and revokes the one-time OAuth token after verification.',
        'Technical and service information generated when the Service operates, such as device and app version, IP address, authentication and security events, timestamps, function and delivery logs, and error information maintained by our infrastructure providers.',
        'Public information imported from the Georgia Tech Cat Sightings iNaturalist project and related public guide, including observations, photos, comments, attribution, and source links.',
      ],
    },
    {
      title: '3. How we use information',
      bullets: [
        'Provide, secure, maintain, troubleshoot, and improve the Service.',
        'Authenticate users, enforce club boundaries and roles, process membership and club-setup requests, and prevent abuse.',
        'Display club content, maps, profiles, attribution, survey and voting experiences, and operational history to authorized club members.',
        'Send account, membership, billing, announcement, election, and club-ping communications.',
        'Operate club subscriptions, meter eligible activity and media usage, reconcile invoices, and meet accounting or tax obligations.',
        'Link an iNaturalist identity at your request and attribute already-imported public observations.',
        'Comply with law, enforce our Terms, protect users and animals, and establish or defend legal claims.',
      ],
    },
    {
      title: '4. Anonymous surveys and private voting',
      paragraphs: [
        'An anonymous survey response does not contain your account identity. A separate receipt links your account to a random response identifier only to enforce one submission; ordinary officer response screens cannot read that receipt. Project administrators with infrastructure access may technically access hosted data.',
        'Community ballots are stored separately from account-linked participation receipts. Results are aggregated after voting closes. Nominations are not anonymous because nominees must be shown to eligible voters.',
      ],
    },
    {
      title: '5. How we disclose information',
      bullets: [
        'Within your club: authorized members and officers receive access according to their role. Officers may review membership applications, named survey responses, moderation records, and operational content. Other members may see profiles, attributed content, and club communications.',
        'Service providers: Google Firebase and Google Cloud provide authentication, databases, storage, functions, hosting, maps, and infrastructure; Expo supports app delivery and push notifications; SendGrid delivers email; Stripe handles billing; and iNaturalist supports public imports and optional account linking.',
        'Universities and external services: information is sent to a university identity provider when you choose single sign-on, and to an external donation or other link when you choose to open it.',
        'Legal and safety: we may disclose information when reasonably necessary to comply with law, respond to valid process, investigate abuse, protect rights and safety, or address threats to people or animals.',
        'Organizational changes: information may be transferred as part of a merger, financing, reorganization, asset transfer, or succession of the Service, subject to this Policy and applicable law.',
      ],
      paragraphs: [
        'Campus Cats does not sell personal information, share it for cross-context behavioral advertising, or use it for targeted advertising. We do not disclose precise location for advertising.',
      ],
    },
    {
      title: '6. Retention',
      paragraphs: [
        'We retain information for as long as reasonably necessary to provide and secure the Service, preserve club operations, comply with law, resolve disputes, and enforce agreements. Retention varies by record: account and profile data generally remain while an account is active; chat and club operational history remain until removed or de-identified; pending verification records expire or are deleted after their operational window; and billing, security, and provider logs may be retained for legal, fraud-prevention, and audit needs.',
        'When you delete your account, Campus Cats removes your authentication account, profile, personal media, authored sightings, chat messages, comments, reactions, participation receipts, linked iNaturalist identity, push token, and other account-linked personal records from active systems. Responses linked through anonymous survey or voting receipts are also removed. Shared club records that must remain coherent may be retained only after your embedded user ID and email are replaced with a generic “deleted account” identity. Residual copies may remain temporarily in restricted backups or provider logs until they are overwritten under ordinary retention schedules.',
      ],
    },
    {
      title: '7. Your choices and privacy rights',
      bullets: [
        'Access and correction: review or edit available profile and content fields in the app, or contact us for help accessing or correcting account information.',
        'Deletion: open More → Account → Delete account. You must enter your account email to confirm. A President must transfer the presidency first so the club is not orphaned. If you cannot sign in, use the public account-deletion page at https://campuscats-d7a5e.web.app/legal/account-deletion.',
        'Location, camera, photos, and notifications: manage these permissions in your device settings. Some features will not work without the corresponding permission.',
        'iNaturalist: unlink your iNaturalist identity from Account settings at any time.',
        'Communications: disable push notifications in device settings. Essential account, security, membership, and billing emails may still be sent.',
        'Applicable-law rights: depending on where you live, you may have rights to know, access, correct, delete, restrict, object, obtain a portable copy, appeal a decision, or avoid discrimination for exercising privacy rights.',
      ],
      paragraphs: [
        'Submit a request to willakins23@gmail.com from the email associated with your account. We may verify your identity and authority before acting. You may use an authorized agent where required by law. We will respond within the period required by applicable law.',
      ],
    },
    {
      title: '8. U.S. state privacy notice',
      paragraphs: [
        'The categories described in Section 2 are the categories of personal information we have collected and disclosed for the business purposes described in Sections 3 and 5 during the preceding 12 months. They may include identifiers, customer records, commercial information, internet or electronic activity, precise geolocation, audio/visual information, education-related information you submit, and inferences inherent in roles or moderation status.',
        'Campus Cats does not sell personal information or share it for cross-context behavioral advertising and therefore does not offer a sale/sharing opt-out. We use sensitive information, including precise geolocation and account credentials, only as reasonably necessary to provide and secure requested features and for other purposes permitted by law.',
      ],
    },
    {
      title: '9. Security',
      paragraphs: [
        'We use administrative, technical, and organizational safeguards designed for the sensitivity of the information, including authenticated access, tenant-aware authorization rules, role-based controls, provider-managed encryption, secret management, and restricted administrative access. No service can guarantee absolute security. Protect your credentials and promptly report suspected unauthorized access.',
      ],
    },
    {
      title: '10. International processing',
      paragraphs: [
        'Campus Cats and its providers may process information in the United States and other countries where providers operate. Those countries may have different data-protection laws. Where required, we use lawful safeguards for cross-border transfers.',
      ],
    },
    {
      title: '11. Children',
      paragraphs: [
        'The Service is not directed to children under 13, and we do not knowingly collect personal information from a child under 13. If you believe a child under 13 has provided information, contact us so we can investigate and delete it. Users below the age of legal majority should use the Service only with permission from a parent or legal guardian.',
      ],
    },
    {
      title: '12. Changes to this Policy',
      paragraphs: [
        'We may update this Policy as the Service, providers, or law changes. We will update the effective date and provide additional notice in the Service when a change is material. Continued use after the effective date of an updated Policy is subject to applicable law.',
      ],
    },
    {
      title: '13. Contact',
      paragraphs: [
        'Campus Cats, Atlanta, Georgia, United States. Email: willakins23@gmail.com.',
      ],
    },
  ],
};

export const termsOfService: LegalDocument = {
  title: 'Terms of Service',
  summary:
    'These Terms of Service (“Terms”) are a binding agreement between you and Campus Cats governing your access to and use of the Service.',
  sections: [
    {
      title: '1. Acceptance and authority',
      paragraphs: [
        'By creating an account, signing in, or using the Service, you agree to these Terms and acknowledge the Privacy Policy. If you do not agree, do not use the Service. If you use the Service for a club or other organization, you represent that you have authority to bind that organization, and “you” includes that organization.',
        'You must be at least 13 years old and legally able to enter this agreement. If you are below the age of legal majority where you live, a parent or legal guardian must permit your use and agree to these Terms on your behalf.',
      ],
    },
    {
      title: '2. The Service and club administration',
      paragraphs: [
        'Campus Cats provides tools for university communities to coordinate community-cat care, including maps, sightings, cat profiles, feeding stations, announcements, events, surveys, votes, chat, integrations, and club administration. Features may change as the Service develops.',
        'Each club controls its membership, roles, content, and day-to-day operations. Club officers may approve or remove accounts, moderate content, issue disciplinary notices, restrict chat, and ban users as allowed by their role. Campus Cats is an independent software service and is not a university, veterinary provider, animal-control agency, emergency service, charity, or payment processor. A club’s presence does not imply endorsement by its university.',
      ],
    },
    {
      title: '3. Accounts and security',
      bullets: [
        'Provide accurate, current information and maintain only the account assigned to you.',
        'Keep credentials confidential, do not share accounts, and promptly notify us of suspected compromise.',
        'Use single sign-on and integrations only for accounts you are authorized to access.',
        'You are responsible for activity through your account until you notify us of unauthorized use.',
      ],
      paragraphs: [
        'We may require verification, reject an access request, revoke sessions, or restrict an account to protect the Service or a club. You may delete your account from Account settings. A President must transfer the presidency before deletion.',
      ],
    },
    {
      title: '4. Acceptable use and community standards',
      bullets: [
        'Do not violate law, another person’s rights, university rules, or animal-welfare requirements.',
        'Do not harass, threaten, impersonate, discriminate, exploit minors, publish private information without permission, or submit unlawful, abusive, deceptive, or sexually explicit content.',
        'Do not upload malware, probe security, evade access controls, scrape the Service, interfere with operation, reverse engineer except where law permits, or use automated access without written permission.',
        'Do not use precise animal or station locations to harm, disturb, capture, trespass upon, or interfere with animals, caregivers, property, or club operations.',
        'Do not submit content you do not have the right to use, including photos of people or private property captured without required consent.',
      ],
    },
    {
      title: '5. Field information and animal safety',
      paragraphs: [
        'Sightings, maps, health descriptions, feeding information, and other member content may be incomplete, delayed, or inaccurate. Do not rely on the Service for veterinary diagnosis, emergencies, personal safety, navigation, or permission to enter property. Contact qualified emergency, veterinary, animal-control, campus, or law-enforcement personnel when appropriate. Follow club protocols and use sound judgment around animals and locations.',
      ],
    },
    {
      title: '6. Your content',
      paragraphs: [
        'You retain ownership of content you submit. You grant Campus Cats a worldwide, non-exclusive, royalty-free license to host, store, reproduce, adapt for technical formatting, display, and distribute that content solely to operate, secure, and improve the Service and the relevant club experience. This license ends when the content is deleted, except for de-identified shared club records, content others independently provided, and copies temporarily retained in backups or as required by law.',
        'You represent that you have all rights and permissions necessary for your content and that its use as described here will not violate law or another person’s rights. You may remove content through available controls. Account deletion removes personal contributions and de-identifies necessary shared operational records as described in the Privacy Policy.',
      ],
    },
    {
      title: '7. Moderation and enforcement',
      paragraphs: [
        'We and authorized club officers may review, restrict, hide, or remove content and may warn, suspend, ban, or terminate accounts when reasonably necessary to enforce these Terms, club rules, law, safety, or service integrity. We are not obligated to monitor all content and do not endorse member content. Appeals or reports may be sent to the club’s listed contacts or willakins23@gmail.com.',
      ],
    },
    {
      title: '8. Club subscriptions and billing',
      paragraphs: [
        'Certain club features require a paid subscription administered by the club President or another authorized role. The administrator authorizes Campus Cats and Stripe to create the selected subscription, collect required billing details, and charge or invoice the club according to the displayed fixed and usage-based terms, taxes, billing interval, and collection method.',
        'Fees are due as stated on the Stripe-hosted checkout, invoice, or billing portal. Except where law requires otherwise or a written order states otherwise, fees already incurred are non-refundable. A club may schedule cancellation or change available billing settings through the Service. Access may be limited or suspended for failed payment, cancellation, abuse, or expired grace periods. External donation pages are operated by third parties; Campus Cats does not process those donations.',
      ],
    },
    {
      title: '9. Third-party services and open-source components',
      paragraphs: [
        'The Service interoperates with third parties such as universities, Google, Expo, Stripe, SendGrid, and iNaturalist and may link to external sites. Their terms and privacy practices govern your direct use of their services. Campus Cats is not responsible for third-party availability, content, transactions, or conduct. Open-source software included in the Service remains subject to its applicable licenses.',
      ],
    },
    {
      title: '10. Campus Cats rights',
      paragraphs: [
        'The Service, including its software, branding, design, and documentation, is owned by Campus Cats or its licensors and is protected by intellectual-property law. Subject to these Terms, Campus Cats gives you a limited, personal, revocable, non-exclusive, non-transferable right to use the Service for its intended purpose. No other rights are granted.',
      ],
    },
    {
      title: '11. Service changes and termination',
      paragraphs: [
        'We may add, change, suspend, or discontinue features, providers, or the Service. We may terminate or suspend your access for a material or repeated breach, legal or safety risk, nonpayment, or conduct that threatens users, animals, clubs, or the Service. You may stop using the Service at any time and may delete your account. Provisions that by nature should survive termination—including ownership, payment obligations, disclaimers, liability limits, indemnity, and dispute terms—will survive.',
      ],
    },
    {
      title: '12. Disclaimers',
      paragraphs: [
        'TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” CAMPUS CATS DISCLAIMS ALL EXPRESS OR IMPLIED WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, ACCURACY, AVAILABILITY, SECURITY, AND THAT THE SERVICE WILL BE ERROR-FREE. CAMPUS CATS DOES NOT WARRANT MEMBER CONTENT, ANIMAL OUTCOMES, LOCATION ACCURACY, CLUB CONDUCT, OR THIRD-PARTY SERVICES. SOME JURISDICTIONS DO NOT ALLOW CERTAIN DISCLAIMERS, SO SOME OF THIS SECTION MAY NOT APPLY TO YOU.',
      ],
    },
    {
      title: '13. Limitation of liability',
      paragraphs: [
        'TO THE MAXIMUM EXTENT PERMITTED BY LAW, CAMPUS CATS AND ITS CONTRIBUTORS, OFFICERS, VOLUNTEERS, LICENSORS, AND SERVICE PROVIDERS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST DATA, PROFITS, GOODWILL, OR OPPORTUNITIES, ARISING FROM THE SERVICE, ANIMALS, LOCATIONS, MEMBER CONTENT, OR THIRD PARTIES, EVEN IF ADVISED OF THE POSSIBILITY.',
        'TO THE MAXIMUM EXTENT PERMITTED BY LAW, THEIR TOTAL LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF 100 U.S. DOLLARS OR THE AMOUNT YOU OR YOUR CLUB PAID CAMPUS CATS FOR THE SERVICE DURING THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM. THESE LIMITS DO NOT APPLY WHERE LIABILITY CANNOT LEGALLY BE LIMITED.',
      ],
    },
    {
      title: '14. Indemnification',
      paragraphs: [
        'To the extent permitted by law, you will defend, indemnify, and hold harmless Campus Cats and its contributors, officers, volunteers, licensors, and service providers from claims, damages, losses, and reasonable costs arising from your content, your misuse of the Service, your violation of these Terms, or your violation of another person’s rights. This obligation does not apply to the extent a claim results from Campus Cats’ own unlawful conduct.',
      ],
    },
    {
      title: '15. Governing law and disputes',
      paragraphs: [
        'These Terms are governed by the laws of the State of Georgia, without regard to conflict-of-law rules. Any court proceeding arising from these Terms or the Service must be brought in the state or federal courts located in Fulton County, Georgia, and each party consents to their jurisdiction and venue. Before filing, the parties will make a good-faith effort for 30 days to resolve the dispute after written notice, unless urgent injunctive relief is reasonably necessary. Consumer protections that cannot be waived remain in effect.',
      ],
    },
    {
      title: '16. General terms',
      paragraphs: [
        'These Terms and the Privacy Policy are the entire agreement about the Service unless a separate written agreement applies. If a provision is unenforceable, it will be limited to the minimum extent necessary and the remaining provisions will remain effective. Failure to enforce a provision is not a waiver. You may not assign these Terms without our consent; Campus Cats may assign them as part of an organizational change. Headings are for convenience only.',
      ],
    },
    {
      title: '17. Changes and contact',
      paragraphs: [
        'We may update these Terms. We will change the effective date and provide additional notice when a change is material. Continued use after updated Terms take effect constitutes acceptance to the extent permitted by law.',
        'Questions or notices: Campus Cats, Atlanta, Georgia, United States; willakins23@gmail.com.',
      ],
    },
  ],
};
