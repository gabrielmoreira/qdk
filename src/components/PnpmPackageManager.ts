import {
  BaseProject,
  createOptionsManager,
  OptionsMerger,
  PackageJson,
  PackageManager,
  PnpmWorkspace,
} from '../index.js';

export interface PnpmPackageManagerOptionsType {
  workspace: boolean;
  version: string;
}
export type PnpmPackageManagerInitialOptions =
  Partial<PnpmPackageManagerOptionsType>;

const PnpmPackageManagerDefaults = {
  workspace: false,
  version: '^9.12.0',
} satisfies PnpmPackageManagerOptionsType;

const optionsMerger: OptionsMerger<
  PnpmPackageManagerOptionsType,
  PnpmPackageManagerInitialOptions,
  typeof PnpmPackageManagerDefaults
> = (initialOptions, defaults) => {
  return {
    ...defaults,
    ...initialOptions,
  };
};

export const PnpmPackageManagerOptions = createOptionsManager(
  Symbol.for('PnpmPackageManagerOptions'),
  PnpmPackageManagerDefaults,
  optionsMerger,
);

export class PnpmPackageManager extends PackageManager<PnpmPackageManagerOptionsType> {
  cmdPrefix = `npx pnpm@${this.options.version}`;
  execCmdPrefix = `npx pnpm@${this.options.version} dlx`;
  constructor(
    scope: BaseProject,
    options: PnpmPackageManagerInitialOptions = {},
  ) {
    const opts = PnpmPackageManagerOptions.getOptions(options, { scope });
    super(scope, opts, opts.version);
    if (this.options.workspace) {
      new PnpmWorkspace(this);
    }
    this.hook('synth:before', () => {
      PackageJson.required(this).setEngine('pnpm', this.options.version);
    });
  }
  async install(opts: { frozen?: boolean } = {}) {
    this.debug('Install dependencies. Options =', opts);
    return this.run(`install${opts.frozen ? ' --frozen-lockfile' : ''}`);
  }
}
