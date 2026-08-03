export const FIREBASE_TEST_PROJECT_ID = 'demo-campus-cats-test';

export function assertDemoProjectId(projectId: string): string {
  if (!projectId.startsWith('demo-')) {
    throw new Error(
      `Firebase tests require a demo- project ID; received ${projectId || '<empty>'}`,
    );
  }

  return projectId;
}
