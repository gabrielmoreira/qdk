import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  eslintPluginPrettierRecommended,
  { ignores: ['dist/**', 'build/**'] },
  // { files: ['eslint.config.mjs', 'src/**/*.ts', 'test/**/*.ts'] },
  { languageOptions: { globals: globals.nodeBuiltin } },
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.config.mjs', '*.cjs', '*.js', '*.mts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/unbound-method': 'warn',
      '@typescript-eslint/consistent-indexed-object-style': 'warn',
    },
  },
);
