import type Globals from 'globals';
import { PackageJson, SourceFileTemplate, TemplateParams } from '../index.js';

export const SourceFileTemplateDefaultLocations = [
  'file_start',
  'imports_start',
  'imports',
  'imports_end',
  'code_start',
  'code',
  'code_end',
  'exports_start',
  'exports',
  'exports_end',
  'file_end',
];

export type EsLintSourceFileDefaultTemplateParams = TemplateParams & {
  'import globals'?: boolean;
  'import eslintPluginPrettierRecommended'?: boolean;
  'tseslint.configs.recommendedTypeChecked'?: boolean;
  'tseslint.configs.stylisticTypeChecked'?: boolean;
  eslintPluginPrettierRecommended?: boolean;
  files?: string[] | boolean;
  ignores?: string[] | boolean;
  globalType?: keyof typeof Globals | boolean;
  allowDefaultProject?: string[] | boolean;
};
export const EsLintSourceFileDefaultTemplate: SourceFileTemplate<EsLintSourceFileDefaultTemplateParams> =
  {
    locations: [...SourceFileTemplateDefaultLocations],
    lines: [
      {
        location: 'imports',
        requires: 'import globals',
        template: `import globals from "globals";`,
        hooks: scope => ({
          'synth:before': () => {
            PackageJson.required(scope).addDevDeps('globals');
          },
        }),
      },
      {
        location: 'imports',
        requires: 'import eslint',
        template: `import eslint from "@eslint/js";`,
        hooks: scope => ({
          'synth:before': () => {
            PackageJson.required(scope).addDevDeps('@eslint/js');
          },
        }),
      },
      {
        location: 'imports',
        requires: 'import tseslint',
        template: `import tseslint from "typescript-eslint";`,
        hooks: scope => ({
          'synth:before': () => {
            PackageJson.required(scope).addDevDeps('typescript-eslint');
          },
        }),
      },
      {
        location: 'imports',
        requires: 'import eslintPluginPrettierRecommended',
        template: `import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended"`,
        hooks: scope => ({
          'synth:before': () => {
            PackageJson.required(scope).addDevDeps(
              'eslint-plugin-prettier/recommended',
            );
          },
        }),
      },
      {
        location: 'exports_start',
        requires: 'export default tseslint.config',
        template: `export default tseslint.config(`,
      },
      {
        location: 'exports',
        requires: 'eslint.configs.recommended',
        template: 'eslint.configs.recommended,',
      },
      {
        location: 'exports',
        requires: 'tseslint.configs.recommendedTypeChecked',
        template: '...tseslint.configs.recommendedTypeChecked,',
      },
      {
        location: 'exports',
        requires: 'tseslint.configs.stylisticTypeChecked',
        template: '...tseslint.configs.stylisticTypeChecked,',
      },
      {
        location: 'exports',
        requires: 'eslintPluginPrettierRecommended',
        template: 'eslintPluginPrettierRecommended,',
      },
      {
        location: 'exports',
        requires: 'files',
        template: ({ files }) => `{files: ${JSON.stringify(files)}},`,
      },
      {
        location: 'exports',
        requires: 'ignores',
        template: ({ ignores }) => `{ignores: ${JSON.stringify(ignores)}},`,
      },
      {
        location: 'exports',
        requires: 'languageOptions.globals',
        template: ({ globalType = 'nodeBuiltin' }) =>
          `{ languageOptions: { globals: globals.${globalType} } },`,
      },
      {
        location: 'exports',
        requires:
          'languageOptions.parserOptions.projectService.allowDefaultProject',
        template: ({ allowDefaultProject = [] }) =>
          `{ languageOptions: { parserOptions: { projectService: { allowDefaultProject: ${JSON.stringify(allowDefaultProject)}} } } },`,
      },
      {
        location: 'exports',
        requires: 'languageOptions.parserOptions.tsconfigRootDir',
        template: () =>
          `{ languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } } },`,
      },
      {
        location: 'exports_end',
        template: `)`,
      },
    ],
  };
