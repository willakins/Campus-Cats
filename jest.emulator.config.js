const base = require('./jest.config');

module.exports = {
  ...base,
  collectCoverage: false,
  setupFilesAfterEnv: [],
  testEnvironment: 'node',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  testMatch: ['<rootDir>/test/**/*.emulator.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/functions/'],
};
