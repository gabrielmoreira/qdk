import {
  Component,
  EsLintSourceFileDefaultTemplate,
  EsLintSourceFileDefaultTemplateParams,
  PackageJson,
  PackageManager,
  Prettier,
  PrettierOptions,
  Scope,
  SourceFileTemplate,
  TemplateFile,
  TemplateParams,
} from '../index.js';

export const EsLintDefaults = {
  version: '^9.0.0',
  prettier: 'auto' as const,
  template: EsLintSourceFileDefaultTemplate,
  allowDefaultProject: ['*.config.{mjs,js}'],
  configFilename: 'eslint.config.js',
};
interface EsLintOptions<
  T extends TemplateParams = EsLintSourceFileDefaultTemplateParams,
> {
  version: string;
  prettier?: PrettierOptions | 'manual' | 'auto' | 'disabled';
  configFilename: string;
  configTemplate: SourceFileTemplate<T>;
  templateParams: T;
  extraTemplateParams?: T;
}
type EsLintInitialOptions = Partial<EsLintOptions>;

export class EsLint extends Component<EsLintOptions> {
  static defaults(options: EsLintInitialOptions, scope: Scope): EsLintOptions {
    const eslintConfigFilename = options.configFilename ?? 'eslint.config.js';
    return {
      ...options,
      version: options.version ?? EsLintDefaults.version,
      prettier: options.prettier ?? EsLintDefaults.prettier,
      configFilename: options.configFilename ?? EsLintDefaults.configFilename,
      configTemplate: options.configTemplate ?? EsLintSourceFileDefaultTemplate,
      templateParams: options.templateParams ?? {
        eslintConfigFilename,
        files: [
          eslintConfigFilename,
          ...(scope.project.sourceSets?.main?.pattern ?? []),
          ...(scope.project.sourceSets?.tests?.pattern ?? []),
        ],
        ignores: [scope.project.buildDir + '/**/*'],
        allowDefaultProject: EsLintDefaults.allowDefaultProject,
        ...options.extraTemplateParams,
      },
    };
  }
  constructor(scope: Scope, options: EsLintInitialOptions = {}) {
    super(scope, EsLint.defaults(options, scope));
    PackageJson.required(this)
      .addDevDeps(
        'eslint@' + this.options.version,
        'typescript-eslint',
        '@eslint/js',
        'globals',
      )
      .setScript('eslint', 'eslint')
      .setScript('eslint:fix', 'eslint --fix');

    this.hook('synth:after', async () => {
      await PackageManager.for(this)?.run('run eslint:fix');
    });
    const { prettier } = this.options;
    const enablePrettier = prettier && prettier !== 'disabled';
    if (enablePrettier) {
      PackageJson.required(this).addDevDeps(
        'eslint-plugin-prettier',
        'eslint-config-prettier',
      );
      if (typeof prettier === 'object') {
        new Prettier(this, prettier);
      } else if (prettier === 'auto') {
        new Prettier(this);
      }
    }
    const { configFilename, configTemplate } = this.options;
    new TemplateFile(
      this,
      {
        basename: configFilename,
        readOnInit: false,
        template: configTemplate,
      },
      {
        template: configTemplate,
        params: this.options.templateParams,
      },
    );
    /*
    new SourceCodeFile(
      this,
      { base: eslintConfigFilename },
      `
import globals from "globals";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
${enablePrettier ? `import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";` : ''}

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ${enablePrettier ? `eslintPluginPrettierRecommended,` : ''}
  {files: ${JSON.stringify(sources)}},
  {ignores: ${JSON.stringify(ignores)}},
  {languageOptions: { globals: globals.nodeBuiltin }},
   {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ${JSON.stringify(allowDefaultProject)}
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);`,
    );
    */
  }
}
