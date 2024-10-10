import {
  BaseProject,
  DefaultOptions,
  PackageJson,
  PackageManager,
  PnpmWorkspace,
} from '../index.js';

const PnpmPackagerManagerDefaults = {
  version: '^9.12.0',
};
interface PnpmPackageManagerOptions {
  workspace?: boolean;
  version: string;
}
type PnpmPackageManagerInitialOptions = Partial<PnpmPackageManagerOptions>;

export class PnpmPackageManager extends PackageManager<PnpmPackageManagerOptions> {
  static defaults(
    options: PnpmPackageManagerInitialOptions,
  ): PnpmPackageManagerOptions {
    return {
      ...DefaultOptions.getWithDefaults(PnpmPackageManager, {
        version: PnpmPackagerManagerDefaults.version,
      }),
      ...options,
    };
  }
  constructor(
    scope: BaseProject,
    options: PnpmPackageManagerInitialOptions = {},
  ) {
    const opts = PnpmPackageManager.defaults(options);
    super(scope, opts, opts.version);
    if (this.options.workspace) {
      new PnpmWorkspace(this);
    }
    this.hook('synth:before', () => {
      PackageJson.required(this).setEngine('pnpm', this.options.version);
    });
  }
  async run(cmd: string) {
    return await this.exec(`npx pnpm@${this.options.version} ${cmd}`);
  }
  async install(opts: { frozen?: boolean } = {}) {
    this.debug('Install dependencies. Options =', opts);
    return this.run(`install${opts.frozen ? ' --frozen-lockfile' : ''}`);
  }
}
