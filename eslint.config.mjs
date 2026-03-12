import next from 'eslint-config-next';

export default [
  ...next,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'out/**',
      'build/**'
    ],
    rules: {
      // This rule is overly strict for our current code style; we use effects for state hydration/reset.
      'react-hooks/set-state-in-effect': 'off',
      // Allow exporting arrays in eslint config file
      'import/no-anonymous-default-export': 'off'
    }
  }
];
