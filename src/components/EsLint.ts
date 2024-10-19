import {
  assertRequired,
  Component,
  createOptions,
  EsLintSourceFileDefaultTemplate,
  EsLintSourceFileDefaultTemplateParams,
  OptionsMerger,
  PackageJson,
  PackageJsonOptions,
  PackageManager,
  Prettier,
  PrettierOptionsType,
  Scope,
  SourceFileTemplate,
  TemplateFile,
  TemplateParams,
} from '../index.js';

export interface EsLintOptionsType<
  T extends TemplateParams = EsLintSourceFileDefaultTemplateParams,
> {
  version: string;
  prettier?: PrettierOptionsType | 'manual' | 'auto' | 'disabled';
  configFilename: string;
  configTemplate: SourceFileTemplate<T>;
  defaultTemplateParams: T;
  templateParams?: T;
  lintAfterSynth?: boolean;
  defaultScripts: Record<string, string | undefined>;
}

export type EsLintInitialOptionsType = Partial<EsLintOptionsType>;

const EsLintDefaults: Partial<EsLintOptionsType> = {
  configFilename: 'eslint.config.js',
  version: '^9.0.0',
  prettier: 'auto',
  configTemplate: EsLintSourceFileDefaultTemplate,
  defaultTemplateParams: {
    allowDefaultProject: ['*.config.{mjs,js}'],
    files: [],
    rules: {},
  },
  defaultScripts: {
    eslint: 'eslint',
    'eslint:fix': 'eslint --fix',
  },
};

PackageJsonOptions.setDefaultVersions({
  eslint: '^9.0.0',
  globals: '^15.11.0',
  'typescript-eslint': '^8.9.0',
  '@eslint/js': '^9.12.0',
  'eslint-plugin-prettier': '^5.2.1',
  'eslint-config-prettier': '^9.1.0',
});

const optionsMerger: OptionsMerger<
  EsLintOptionsType,
  EsLintInitialOptionsType
> = (initialOptions, defaults, context): EsLintOptionsType => {
  const { scope } = context;
  const baseOptions = {
    ...defaults,
    ...initialOptions,
  };
  const eslintConfigFilename = assertRequired(
    baseOptions.configFilename,
    'configFilename is required',
  );
  const mergedOptions: Partial<
    EsLintOptionsType<EsLintSourceFileDefaultTemplateParams>
  > = {
    ...baseOptions,
    defaultTemplateParams: initialOptions.defaultTemplateParams ?? {
      ...defaults.defaultTemplateParams,
      eslintConfigFilename,
      files: [
        eslintConfigFilename,
        ...(scope.project.sourceSets?.main?.pattern ?? []),
        ...(scope.project.sourceSets?.tests?.pattern ?? []),
      ],
      ignores: [scope.project.buildDir + '/**/*'],
      allowDefaultProject: assertRequired(
        baseOptions?.defaultTemplateParams?.allowDefaultProject,
        'templateParams.allowDefaultProject is required',
      ),
      ...defaults?.templateParams,
      ...initialOptions.templateParams,
    },
    lintAfterSynth: initialOptions.lintAfterSynth ?? false,
  };

  return {
    ...mergedOptions,
    defaultScripts: {
      ...mergedOptions.defaultScripts,
    },
    version: assertRequired(mergedOptions.version, 'version is required'),
    configFilename: assertRequired(
      mergedOptions.configFilename,
      'configFilename is required',
    ),
    configTemplate: assertRequired(
      mergedOptions.configTemplate,
      'configTemplate is required',
    ),
    defaultTemplateParams: assertRequired(
      mergedOptions.defaultTemplateParams,
      'templateParams is required',
    ),
  };
};

export const EsLintOptions = createOptions(
  'EsLintOptions',
  EsLintDefaults,
  optionsMerger,
);

export class EsLint extends Component<EsLintOptionsType> {
  readonly file: TemplateFile<EsLintOptionsType['defaultTemplateParams']>;
  constructor(scope: Scope, options: EsLintInitialOptionsType = {}) {
    super(
      scope,
      EsLintOptions.getOptions(options, {
        scope,
      }),
    );
    const pkg = PackageJson.required(this).addDevDeps(
      'eslint@' + this.options.version,
      'typescript-eslint',
      '@eslint/js',
      'globals',
    );
    pkg.addScripts(this.options.defaultScripts);

    this.hook('synth:after', async () => {
      if (this.options.lintAfterSynth) {
        await PackageManager.for(this)?.run('run eslint:fix');
      }
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
    this.file = new TemplateFile(
      this,
      {
        basename: configFilename,
        readOnInit: false,
        template: configTemplate,
      },
      {
        template: configTemplate,
        params: this.options.defaultTemplateParams,
      },
    );
  }
}
