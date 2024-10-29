import {
  createOptions,
  OptionsMerger,
  PackageJson,
  PackageManager,
  PnpmWorkspace,
  Scope,
} from '../index.mjs';

export interface PnpmPackageManagerOptionsType {
  workspace: boolean;
  version: string;
}
export type PnpmPackageManagerInitialOptions =
  Partial<PnpmPackageManagerOptionsType>;

const PnpmPackageManagerDefaults = {
  workspace: false,
  version: '9.12.2',
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

export const PnpmPackageManagerOptions = createOptions(
  'PnpmPackageManagerOptions',
  PnpmPackageManagerDefaults,
  optionsMerger,
);

export class PnpmPackageManager extends PackageManager<
  PnpmPackageManagerOptionsType,
  PnpmPackageManagerInitialOptions
> {
  type = 'pnpm';
  cmdPrefix = `pnpm`;
  execCmdPrefix = `pnpx`;

  formatWorkspaceVersion(version?: string): string {
    return `workspace:${version ?? '*'}`;
  }

  async setup() {
    await this.corepackRun(`use pnpm@${this.options.version}`);
  }

  createSubprojectInstance(
    scope: Scope,
    options?: PnpmPackageManagerInitialOptions,
  ): this {
    return new PnpmPackageManager(scope, options) as this;
  }
  constructor(scope: Scope, options: PnpmPackageManagerInitialOptions = {}) {
    // fail if a package manager is already defined to this project
    scope.project.ensureComponentIsNotDefined(PackageManager.of);
    const opts = PnpmPackageManagerOptions.getOptions(options, { scope });
    super(scope, opts, opts.version);
    if (this.options.workspace) {
      new PnpmWorkspace(this);
    }
    this.hook('synth:before', () => {
      PackageJson.required(this).setPackageManager(
        'pnpm',
        this.options.version,
      );
    });
  }
  async install(opts: { frozen?: boolean } = {}) {
    this.debug('Install dependencies. Options =', opts);
    return this.pkgRun(`install${opts.frozen ? ' --frozen-lockfile' : ''}`);
  }
}
