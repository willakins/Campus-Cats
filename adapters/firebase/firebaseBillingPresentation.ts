import { BillingProviderPresentation } from '../../core/ports';

export const firebaseBillingPresentation: BillingProviderPresentation = {
  settingsSubtitle: 'Review monthly Firebase and Google Cloud costs',
  consoleDescription:
    'Firebase and Google Cloud share this project and billing account.',
  consoleLinks: (projectId) => {
    const encodedProjectId = encodeURIComponent(projectId);
    return [
      {
        label: 'Open Firebase Console',
        url: `https://console.firebase.google.com/project/${encodedProjectId}/overview`,
      },
      {
        label: 'Open Google Cloud Billing',
        url: `https://console.cloud.google.com/billing?project=${encodedProjectId}`,
      },
    ];
  },
  setup: (summary) => ({
    message:
      summary.reason === 'access-denied'
        ? 'The billing export exists, but the app service account cannot read it yet.'
        : 'Google Cloud Billing is not exporting cost data to the expected BigQuery dataset yet.',
    title: 'Connect the billing export',
    steps: [
      'Enable the Standard usage cost export in Google Cloud Billing.',
      `Export it to ${summary.exportProjectId}.${summary.datasetId} in the US location.`,
      'Give the Functions service account BigQuery Job User and Data Viewer access.',
      'Return here after Google creates and populates the export table.',
    ],
    action: {
      label: 'Set Up Billing Export',
      url: `https://console.cloud.google.com/billing/export?project=${encodeURIComponent(summary.projectId)}`,
    },
  }),
};
