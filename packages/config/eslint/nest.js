import tseslint from 'typescript-eslint';

import { baseConfig } from './base.js';

/**
 * Пресет для Nest.js: Node-окружение, декораторы, DI.
 * @type {import('typescript-eslint').ConfigArray}
 */
export const nestConfig = tseslint.config(...baseConfig, {
  files: ['**/*.ts'],
  languageOptions: {
    sourceType: 'commonjs',
    parserOptions: {
      projectService: true,
    },
  },
  rules: {
    // Декораторы Nest часто требуют пустых классов-обёрток (модули, DTO)
    '@typescript-eslint/no-extraneous-class': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',
    // Контроллеры возвращают Promise, которые обрабатывает фреймворк
    '@typescript-eslint/no-floating-promises': 'off',
    '@typescript-eslint/explicit-member-accessibility': [
      'error',
      { accessibility: 'no-public', overrides: { parameterProperties: 'explicit' } },
    ],
  },
});

export default nestConfig;
