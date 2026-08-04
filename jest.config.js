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
    'theme/**/*.{ts,tsx}',
    'components/design/**/*.{ts,tsx}',
    'components/auth/**/*.{ts,tsx}',
    'components/ui/LoadingIndicator.tsx',
    '!**/*.test.{ts,tsx}',
    '!**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};
