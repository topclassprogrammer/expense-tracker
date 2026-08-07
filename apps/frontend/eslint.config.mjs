import { nextConfig } from '@expense-tracker/config/eslint/next';

export default [
  ...nextConfig,
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
];
