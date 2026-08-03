import { assertDemoProjectId } from './firebaseProject';

describe('Firebase emulator project safety', () => {
  it('accepts an isolated demo project', () => {
    expect(assertDemoProjectId('demo-campus-cats-test')).toBe(
      'demo-campus-cats-test',
    );
  });

  it('rejects the production project and other real project IDs', () => {
    expect(() => assertDemoProjectId('campus-cats-production')).toThrow(
      'Firebase tests require a demo- project ID',
    );
    expect(() => assertDemoProjectId('')).toThrow(
      'Firebase tests require a demo- project ID',
    );
  });
});
