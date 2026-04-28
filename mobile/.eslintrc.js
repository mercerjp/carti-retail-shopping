module.exports = {
  root: true,
  extends: ['expo', 'prettier'],
  ignorePatterns: ['node_modules', '.expo', 'dist', 'coverage', 'babel.config.js'],
  rules: {
    'react/no-unescaped-entities': 'off',
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/__mocks__/**'],
      rules: {
        'import/first': 'off',
      },
    },
  ],
};
