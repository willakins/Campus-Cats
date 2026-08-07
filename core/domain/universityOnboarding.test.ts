import {
  defaultClubName,
  emailMatchesUniversity,
  normalizeUniversityQuery,
  parseClubSetupDraft,
  parseUniversitySearchResult,
} from './universityOnboarding';

describe('university onboarding', () => {
  it('normalizes university searches without accepting blank input', () => {
    expect(normalizeUniversityQuery('  Georgia   Tech ')).toBe('georgia tech');
    expect(normalizeUniversityQuery(' G ')).toBe('g');
  });

  it('requires an approved school domain while allowing its subdomains', () => {
    expect(emailMatchesUniversity('student@gatech.edu', ['gatech.edu'])).toBe(true);
    expect(emailMatchesUniversity('student@mail.gatech.edu', ['gatech.edu'])).toBe(true);
    expect(emailMatchesUniversity('student@notgatech.edu', ['gatech.edu'])).toBe(false);
    expect(emailMatchesUniversity('invalid', ['gatech.edu'])).toBe(false);
  });

  it('builds and validates a new club draft from a selected result', () => {
    expect(defaultClubName('Georgia Institute of Technology')).toBe(
      'Georgia Institute of Technology Campus Cats',
    );
    expect(
      parseClubSetupDraft({
        universityId: '139755',
        clubName: 'Georgia Tech Campus Cats',
        primaryColor: '#003057',
        accentColor: '#B3A369',
        presidentChoice: 'self',
        presidentEmail: 'president@gatech.edu',
      }),
    ).toMatchObject({ primaryColor: '#003057', accentColor: '#B3A369' });
  });

  it('parses mapped university discovery without trusting arbitrary status data', () => {
    expect(
      parseUniversitySearchResult({
        id: '139755',
        name: 'Georgia Institute of Technology-Main Campus',
        city: 'Atlanta',
        state: 'GA',
        emailDomains: ['gatech.edu'],
        timezone: 'America/New_York',
        status: 'mapped',
        club: {
          id: 'campus-cats',
          name: 'Campus Cats',
          emailEnabled: true,
          saml: { provider: 'gt-sso', label: 'Georgia Tech SSO' },
        },
      }),
    ).toMatchObject({ status: 'mapped', club: { id: 'campus-cats' } });
  });
});
