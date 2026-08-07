import { httpsCallable } from 'firebase/functions';

import { FirebaseTenantScope } from './FirebaseTenantScope';
import { FirebaseWhitelistSubmission } from './FirebaseWhitelistSubmission';

jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));

describe('FirebaseWhitelistSubmission', () => {
  it('routes a signed-out application to the selected university club', async () => {
    const invoke = jest.fn().mockResolvedValue({
      data: { status: 'created', id: 'application-1' },
    });
    jest.mocked(httpsCallable).mockReturnValue(invoke as never);
    const scope = new FirebaseTenantScope();
    scope.setSelectedClub('club-139658');
    const adapter = new FirebaseWhitelistSubmission({} as never, scope);

    await adapter.submit({
      name: 'Alex Applicant',
      graduationYear: '2028',
      email: 'alex@emory.edu',
      codeWord: '',
    });

    expect(invoke).toHaveBeenCalledWith(expect.objectContaining({
      clubId: 'club-139658',
      email: 'alex@emory.edu',
    }));
  });
});
