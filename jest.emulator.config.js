const base = require('./jest.config');

module.exports = {
  ...base,
  collectCoverage: false,
  setupFiles: ['<rootDir>/test/support/emulatorEnvironment.js'],
  setupFilesAfterEnv: [],
  testEnvironment: 'node',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  testMatch: ['<rootDir>/test/**/*.emulator.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/functions/'],
};
