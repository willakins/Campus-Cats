import type { ClubBillingPort } from '../../core/ports';
import {
  DevelopmentClubBilling,
  createClubBillingGateway,
} from './DevelopmentClubBilling';

const delegate = (): jest.Mocked<ClubBillingPort> => ({
  observeAccess: jest.fn<
    ReturnType<ClubBillingPort['observeAccess']>,
    Parameters<ClubBillingPort['observeAccess']>
  >((_clubId, _onChange, _onError) => jest.fn()),
  getSummary: jest.fn(),
  createSetupSession: jest.fn(),
  createPortalSession: jest.fn(),
  payOutstandingInvoice: jest.fn(),
  setCollectionMethod: jest.fn(),
  updateBillingEmail: jest.fn(),
  scheduleCancellation: jest.fn(),
  resumeSubscription: jest.fn(),
});

describe('Development club billing', () => {
  it('observes the seeded access projection without exposing Stripe operations', async () => {
    const firebase = delegate();
    const billing = new DevelopmentClubBilling(firebase);
    const onChange = jest.fn();

    billing.observeAccess('campus-cats', onChange);

    expect(firebase.observeAccess).toHaveBeenCalledWith(
      'campus-cats',
      onChange,
      undefined,
    );
    await expect(billing.getSummary()).rejects.toThrow(
      'Billing is disabled in development',
    );
    await expect(billing.createSetupSession('return-url')).rejects.toThrow(
      'Billing is disabled in development',
    );
    await expect(billing.createPortalSession('return-url')).rejects.toThrow(
      'Billing is disabled in development',
    );
    await expect(billing.payOutstandingInvoice()).rejects.toThrow(
      'Billing is disabled in development',
    );
    await expect(
      billing.setCollectionMethod('automatic', 'return-url'),
    ).rejects.toThrow('Billing is disabled in development');
    await expect(
      billing.updateBillingEmail('developer@example.com'),
    ).rejects.toThrow('Billing is disabled in development');
    await expect(billing.scheduleCancellation()).rejects.toThrow(
      'Billing is disabled in development',
    );
    await expect(billing.resumeSubscription()).rejects.toThrow(
      'Billing is disabled in development',
    );
    expect(firebase.getSummary).not.toHaveBeenCalled();
    expect(firebase.createSetupSession).not.toHaveBeenCalled();
    expect(firebase.createPortalSession).not.toHaveBeenCalled();
    expect(firebase.payOutstandingInvoice).not.toHaveBeenCalled();
    expect(firebase.setCollectionMethod).not.toHaveBeenCalled();
    expect(firebase.updateBillingEmail).not.toHaveBeenCalled();
    expect(firebase.scheduleCancellation).not.toHaveBeenCalled();
    expect(firebase.resumeSubscription).not.toHaveBeenCalled();
  });

  it('is selected only for development builds', () => {
    const firebase = delegate();

    expect(createClubBillingGateway(firebase, 'development')).toBeInstanceOf(
      DevelopmentClubBilling,
    );
    expect(createClubBillingGateway(firebase, 'production')).toBe(firebase);
  });
});
