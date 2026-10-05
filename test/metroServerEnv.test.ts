jest.mock('expo/metro-config', () => ({
  getDefaultConfig: () => ({
    resolver: { blockList: [/existing-private-path/] },
  }),
}));
const config = require('../metro.config.js');
const blocked = (path: string) =>
  config.resolver.blockList.some((rule: RegExp) => rule.test(path));
it('excludes server env files from Expo contexts while preserving client env files and existing exclusions', () => {
  for (const path of [
    '/project/.env.supabase.local',
    '/project/.env.supabase.example',
    '/project/functions/.env.production',
    'C:\\project\\.env.supabase.local',
    '/project/existing-private-path',
  ])
    expect(blocked(path)).toBe(true);
  for (const path of [
    '/project/.env.development.local',
    '/project/.env.production.local',
    '/project/core/domain/models.ts',
  ])
    expect(blocked(path)).toBe(false);
});
