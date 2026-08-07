import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  // cjs — для Nest.js, esm — для Next.js
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: 'es2022',
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
});
