import { httpsCallable } from 'firebase/functions';

import { FirebaseUniversityOnboarding } from './FirebaseUniversityOnboarding';

jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));

describe('FirebaseUniversityOnboarding', () => {
  it('translates the public onboarding callable contract', async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: [
        {
          id: '139755',
          name: 'Georgia Institute of Technology-Main Campus',
          city: 'Atlanta',
          state: 'GA',
          emailDomains: ['gatech.edu'],
          timezone: 'America/New_York',
          status: 'unclaimed',
        },
      ],
    });
    jest.mocked(httpsCallable).mockReturnValue(invoke as never);
    const gateway = new FirebaseUniversityOnboarding({} as never);

    await expect(gateway.search('georgia')).resolves.toHaveLength(1);
    expect(httpsCallable).toHaveBeenCalledWith({}, 'searchUniversities');
    expect(invoke).toHaveBeenCalledWith({ query: 'georgia' });
  });
});
