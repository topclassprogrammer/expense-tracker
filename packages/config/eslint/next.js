import nextPlugin from '@next/eslint-plugin-next';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { baseConfig } from './base.js';

/**
 * Пресет для Next.js App Router: React 19, RSC, браузерное окружение.
 * @type {import('typescript-eslint').ConfigArray}
 */
export const nextConfig = tseslint.config(...baseConfig, {
  files: ['**/*.{ts,tsx}'],
  languageOptions: {
    globals: { ...globals.browser, ...globals.node },
    parserOptions: {
      ecmaFeatures: { jsx: true },
      projectService: true,
    },
  },
  plugins: {
    react,
    'react-hooks': reactHooks,
    'jsx-a11y': jsxA11y,
    '@next/next': nextPlugin,
  },
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    ...react.configs.flat.recommended.rules,
    ...reactHooks.configs.recommended.rules,
    ...jsxA11y.flatConfigs.recommended.rules,
    ...nextPlugin.configs.recommended.rules,
    ...nextPlugin.configs['core-web-vitals'].rules,
    // В React 19 + Next.js импорт React не требуется
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
  },
});

export default nextConfig;
