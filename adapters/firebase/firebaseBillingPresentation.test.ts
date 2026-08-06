import { BillingSummary } from '../../core/ports';
import { firebaseBillingPresentation } from './firebaseBillingPresentation';

const setupSummary: Extract<
  BillingSummary,
  { readonly status: 'setup-required' }
> = {
  status: 'setup-required',
  projectId: 'campus-cats',
  exportProjectId: 'billing-project',
  datasetId: 'billing_export',
  generatedAt: '2026-08-06T12:00:00.000Z',
  reason: 'export-not-configured',
};

describe('firebaseBillingPresentation', () => {
  it('owns Firebase console links and billing-export guidance', () => {
    expect(firebaseBillingPresentation.consoleLinks('campus cats')).toEqual([
      {
        label: 'Open Firebase Console',
        url: 'https://console.firebase.google.com/project/campus%20cats/overview',
      },
      {
        label: 'Open Google Cloud Billing',
        url: 'https://console.cloud.google.com/billing?project=campus%20cats',
      },
    ]);

    expect(firebaseBillingPresentation.setup(setupSummary)).toMatchObject({
      title: 'Connect the billing export',
      steps: expect.arrayContaining([
        expect.stringContaining('Google Cloud Billing'),
        expect.stringContaining('billing-project.billing_export'),
        expect.stringContaining('BigQuery'),
      ]),
      action: {
        label: 'Set Up Billing Export',
        url: 'https://console.cloud.google.com/billing/export?project=campus-cats',
      },
    });
  });
});
