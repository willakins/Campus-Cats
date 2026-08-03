module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/functions/',
    '\\.emulator\\.test\\.[jt]sx?$',
  ],
  collectCoverageFrom: [
    'core/**/*.{ts,tsx}',
    'features/**/*.{ts,tsx}',
    'adapters/**/*.{ts,tsx}',
    '!**/*.test.{ts,tsx}',
    '!**/index.ts',
  ],
  coverageDirectory: 'coverage',
};
