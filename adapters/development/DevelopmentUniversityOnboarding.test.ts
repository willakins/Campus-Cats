import { DevelopmentUniversityOnboarding } from './DevelopmentUniversityOnboarding';
import { FirebaseUniversityOnboarding } from '../firebase/FirebaseUniversityOnboarding';
import { createUniversityOnboardingGateway } from '../firebase/createUniversityOnboardingGateway';
import type { UniversityOnboardingPort } from '../../core/ports';

jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));

describe('Development university onboarding', () => {
  const discovery = (): jest.Mocked<UniversityOnboardingPort> => ({
    search: jest.fn(),
    get: jest.fn(),
    requestSetup: jest.fn(),
    verifySetup: jest.fn(),
  });

  it('delegates search and restoration to the complete development catalog', async () => {
    const catalog = discovery();
    catalog.search.mockResolvedValue([
      {
        id: '139658',
        name: 'Emory University',
        city: 'Atlanta',
        state: 'GA',
        emailDomains: ['emory.edu'],
        timezone: 'America/New_York',
        status: 'unclaimed',
      },
    ]);
    catalog.get.mockResolvedValue({
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
      },
    });
    const onboarding = new DevelopmentUniversityOnboarding(catalog);

    await expect(onboarding.search('Emory')).resolves.toEqual([
      expect.objectContaining({ id: '139658', name: 'Emory University' }),
    ]);
    await expect(onboarding.get('139755')).resolves.toEqual(
      expect.objectContaining({ status: 'mapped' }),
    );
    expect(catalog.search).toHaveBeenCalledWith('Emory');
    expect(catalog.get).toHaveBeenCalledWith('139755');
  });

  it('does not expose club provisioning in the development shortcut', async () => {
    const catalog = discovery();
    const onboarding = new DevelopmentUniversityOnboarding(catalog);

    await expect(
      onboarding.requestSetup({
        universityId: '139755',
        clubName: 'Campus Cats',
        primaryColor: '#18314F',
        accentColor: '#B58A16',
        presidentChoice: 'self',
        presidentEmail: 'developer@example.com',
      }),
    ).rejects.toThrow('Development club provisioning is disabled');
    await expect(
      onboarding.verifySetup('request-1', 'verification-token'),
    ).rejects.toThrow('Development club provisioning is disabled');
    expect(catalog.requestSetup).not.toHaveBeenCalled();
    expect(catalog.verifySetup).not.toHaveBeenCalled();
  });

  it('is selected only for development builds', () => {
    expect(
      createUniversityOnboardingGateway({} as never, 'development'),
    ).toBeInstanceOf(DevelopmentUniversityOnboarding);
    expect(
      createUniversityOnboardingGateway({} as never, 'production'),
    ).toBeInstanceOf(FirebaseUniversityOnboarding);
  });
});
