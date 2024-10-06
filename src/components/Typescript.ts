import {
  Component,
  PackageJson,
  Project,
  TsConfig,
  TsConfigInitialOptions,
} from '../index.js';

export const TypescriptDefaults = {
  version: '^5.6.2',
  scripts: {
    typescript: 'tsc',
    'typescript:check':
      'tsc -p tsconfig.json --noEmit --explainFiles > explainTypes.txt',
  },
};
export interface TypescriptOptions {
  version: string;
  tsconfig?: TsConfigInitialOptions;
}
export type TypescriptInitialOptions = Partial<TypescriptOptions>;

export class Typescript extends Component {
  tsconfig: TsConfig;
  static defaults(
    options: TypescriptInitialOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    scope: Project,
  ): TypescriptOptions {
    return {
      version: options.version ?? TypescriptDefaults.version,
      ...options,
    };
  }
  constructor(scope: Project, options: TypescriptInitialOptions = {}) {
    const opts = Typescript.defaults(options, scope);
    super(scope, opts, opts.version);
    this.tsconfig = new TsConfig(this, opts.tsconfig);
    const pkg = PackageJson.required(this).addDevDeps(
      `typescript@${opts.version}`,
    );
    Object.entries(TypescriptDefaults.scripts).forEach(([key, value]) => {
      pkg.setScript(key, value);
    });
  }
}
