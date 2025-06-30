/* eslint-env node */
// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/strict',
    'expo',
    'prettier',
  ],
  rules: {
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'error',
    '@typescript-eslint/return-await': 'error',
    '@typescript-eslint/consistent-type-assertions': 'error',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-meaningless-void-operator': 'error',
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        checksVoidReturn: {
          attributes: false,
          properties: false,
        },
      },
    ],
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
  overrides: [
    {
      files: [
        'app/(auth)/create-account.tsx',
        'app/(auth)/saml-sign-in.tsx',
        'components/ui/DateTimeInput.android.tsx',
        'config/firebase.js',
        'forms/AnnouncementForm.tsx',
        'forms/CatalogForm.tsx',
        'forms/SightingForm.tsx',
        'forms/SightingReport.tsx',
        'forms/StationForm.tsx',
        'forms/controls/FilePicker.tsx',
        'functions/src/index.ts',
        'services/AnnouncementsService.ts',
        'services/CatalogService.ts',
      ],
      rules: {
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
      },
    },
  ],
};
