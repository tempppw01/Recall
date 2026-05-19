import next from 'eslint-config-next';

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'out/**',
      'build/**',
      'docs/参考项目/**'
    ],
  },
  ...next,
  {
    rules: {
      // This rule is overly strict for our current code style; we use effects for state hydration/reset.
      'react-hooks/set-state-in-effect': 'off',
      // Allow exporting arrays in eslint config file
      'import/no-anonymous-default-export': 'off'
    }
  }
];
