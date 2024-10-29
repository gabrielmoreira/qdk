import type Globals from 'globals';
import {
  Jsonifiable,
  PackageJson,
  SourceFileTemplate,
  TemplateParams,
} from '../../index.mjs';

export const SourceFileTemplateDefaultTags = [
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

type Severity = 0 | 1 | 2;
type SeverityString = 'error' | 'off' | 'warn';
type RuleLevel = Severity | SeverityString;
type RuleLevelAndOptions = [RuleLevel, ...Jsonifiable[]];
type RuleEntry = RuleLevel | RuleLevelAndOptions;
type RulesRecord = Partial<Record<string, RuleEntry>>;

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
  rules?: RulesRecord | false;
};
export const EsLintSourceFileDefaultTemplate: SourceFileTemplate<EsLintSourceFileDefaultTemplateParams> =
  {
    tags: [...SourceFileTemplateDefaultTags],
    blocks: [
      {
        tag: 'imports',
        condition: 'import globals',
        template: `import globals from "globals";`,
        hooks: scope => ({
          'synth:before': () => {
            PackageJson.required(scope).addDevDeps('globals');
          },
        }),
      },
      {
        tag: 'imports',
        condition: 'import eslint',
        template: `import eslint from "@eslint/js";`,
        hooks: scope => ({
          'synth:before': () => {
            PackageJson.required(scope).addDevDeps('@eslint/js');
          },
        }),
      },
      {
        tag: 'imports',
        condition: 'import tseslint',
        template: `import tseslint from "typescript-eslint";`,
        hooks: scope => ({
          'synth:before': () => {
            PackageJson.required(scope).addDevDeps('typescript-eslint');
          },
        }),
      },
      {
        tag: 'imports',
        condition: 'import eslintPluginPrettierRecommended',
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
        tag: 'exports_start',
        condition: 'export default tseslint.config',
        template: `export default tseslint.config(`,
      },
      {
        tag: 'exports',
        condition: 'eslint.configs.recommended',
        template: 'eslint.configs.recommended,',
      },
      {
        tag: 'exports',
        condition: 'tseslint.configs.recommendedTypeChecked',
        template: '...tseslint.configs.recommendedTypeChecked,',
      },
      {
        tag: 'exports',
        condition: 'tseslint.configs.stylisticTypeChecked',
        template: '...tseslint.configs.stylisticTypeChecked,',
      },
      {
        tag: 'exports',
        condition: 'eslintPluginPrettierRecommended',
        template: 'eslintPluginPrettierRecommended,',
      },
      {
        tag: 'exports',
        condition: 'files',
        template: ({ files }) => `{files: ${JSON.stringify(files)}},`,
      },
      {
        tag: 'exports',
        condition: 'ignores',
        template: ({ ignores }) => `{ignores: ${JSON.stringify(ignores)}},`,
      },
      {
        tag: 'exports',
        condition: 'languageOptions.globals',
        template: ({ globalType = 'nodeBuiltin' }) =>
          `{ languageOptions: { globals: globals.${globalType} } },`,
      },
      {
        tag: 'exports',
        condition:
          'languageOptions.parserOptions.projectService.allowDefaultProject',
        template: ({ allowDefaultProject = [] }) =>
          `{ languageOptions: { parserOptions: { projectService: { allowDefaultProject: ${JSON.stringify(allowDefaultProject)}} } } },`,
      },
      {
        tag: 'exports',
        condition: 'rules',
        template: ({ rules }) => `{ rules: ${JSON.stringify(rules)}},`,
      },
      {
        tag: 'exports',
        condition: 'languageOptions.parserOptions.tsconfigRootDir',
        template: () =>
          `{ languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } } },`,
      },
      {
        tag: 'exports_end',
        template: `)`,
      },
    ],
  };
