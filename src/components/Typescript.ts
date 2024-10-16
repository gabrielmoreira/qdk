import {
  Component,
  createOptionsManager,
  OptionsMerger,
  PackageJson,
  PackageJsonOptions,
  Scope,
  TsConfig,
  TsConfigInitialOptionsType,
} from '../index.js';

export interface TypescriptOptionsType {
  version: string;
  tsconfig?: TsConfigInitialOptionsType;
  defaultScripts: Record<string, string | undefined>;
}
export type TypescriptInitialOptions = Partial<TypescriptOptionsType>;

const TypescriptDefaults = {
  version: '^5.6.2',
  tsconfig: {},
  defaultScripts: {
    typescript: 'tsc',
    'typescript:check': 'tsc -p tsconfig.json --noEmit',
    'typescript:explain':
      'tsc -p tsconfig.json --noEmit --explainFiles > explainTypes.txt',
  },
} satisfies TypescriptOptionsType;

PackageJsonOptions.setDefaultVersions({
  typescript: '^5.6.2',
});

const optionsMerger: OptionsMerger<
  TypescriptOptionsType,
  TypescriptInitialOptions,
  typeof TypescriptDefaults
> = (initialOptions, defaults) => {
  return {
    ...defaults,
    ...initialOptions,
    tsconfig: {
      ...defaults.tsconfig,
      ...initialOptions.tsconfig,
    },
    defaultScripts: {
      ...defaults.defaultScripts,
      ...initialOptions.defaultScripts,
    },
  };
};

export const TypescriptOptions = createOptionsManager(
  Symbol.for('TypescriptOptions'),
  TypescriptDefaults,
  optionsMerger,
);

export class Typescript extends Component<TypescriptOptionsType> {
  readonly tsconfig: TsConfig;

  constructor(scope: Scope, options: TypescriptInitialOptions = {}) {
    const opts = TypescriptOptions.getOptions(options, {
      scope,
    });
    super(scope.project, opts, opts.version);
    this.tsconfig = new TsConfig(this, opts.tsconfig);
    const pkg = PackageJson.required(this).addDevDeps(
      `typescript@${opts.version}`,
    );
    pkg.addScripts(opts.defaultScripts);
  }
}
