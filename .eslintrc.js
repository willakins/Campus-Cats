/* eslint-env node */
// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: [
    'eslint:recommended',
    // 'plugin:@typescript-eslint/recommended',
    // 'plugin:@typescript-eslint/recommended-type-checked',
    // 'plugin:@typescript-eslint/strict',
    'expo',
    'prettier',
  ],
  rules: {
    // '@typescript-eslint/explicit-function-return-type': 'error',
    // 'no-shadow': 'off',
    // '@typescript-eslint/no-shadow': 'error',
  },
  ignorePatterns: [
    '/dist/*',
    '/dataconnect-generated/*',
    '.eslintrc.js',
    '*.config.js',
    '*.cjs',
    '/functions/lib/*',
  ],
  plugins: ['@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    projectService: true,
    tsconfigRootDir: __dirname,
  },
  root: true,
};
