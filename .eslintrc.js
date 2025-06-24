/* eslint-env node */
// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: [
    'eslint:recommended',
    // 'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/strict',
    'expo',
    'prettier',
  ],
  rules: {
    // '@typescript-eslint/explicit-function-return-type': 'error',
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'error',
    '@typescript-eslint/return-await': 'error',
    '@typescript-eslint/consistent-type-assertions': 'error',
    '@typescript-eslint/no-require-imports': 'off',
  },
  ignorePatterns: [
    '/dist/*',
    '/dataconnect-generated/*',
    '/*.*',
    '/functions/lib/*',
  ],
  plugins: ['@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    projectService: true,
    tsconfigRootDir: __dirname,
  },
  root: true,
};
