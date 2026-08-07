import { nestConfig } from '@expense-tracker/config/eslint/nest';

export default [
  ...nestConfig,
  {
    ignores: ['dist/**', 'node_modules/**', 'prisma/migrations/**'],
  },
];
