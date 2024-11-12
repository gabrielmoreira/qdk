import {
  createOptions,
  getForceAllPackageManagerInstall,
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
  version: '9.12.3',
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
  didInstallRun = false;

  private isCorepackInstalled = false;

  formatWorkspaceVersion(version?: string): string {
    return `workspace:${version ?? '*'}`;
  }

  async setup() {
    // do not setup corepack pnpm if it's already there
    if (this.isCorepackInstalled) return;
    // do not setup corepack pnpm if this project is part
    // of a workspace, and the workspace root project has
    // corepack pnpm already configured
    if (this.isCorepackInstalledForWorkspace()) return;
    await this.corepackRun(`use pnpm@${this.options.version}`);
    this.isCorepackInstalled = true;
  }

  protected isCorepackInstalledForWorkspace(): boolean {
    const rootPackageManager = PackageManager.for(this.project.root);
    if (this === rootPackageManager && this.options.workspace) {
      return this.isCorepackInstalled;
    }
    if (rootPackageManager) {
      if (rootPackageManager instanceof PnpmPackageManager) {
        if (rootPackageManager.isCorepackInstalledForWorkspace()) {
          return true;
        }
      }
    }
    return false;
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
  async install(opts: { frozen?: boolean; force?: boolean } = {}) {
    const shouldForceInstall = opts.force ?? getForceAllPackageManagerInstall();
    const workspacePnpmPackageManager = shouldForceInstall
      ? null
      : this.getWorkspacePnpmPackageManager();

    if (
      // if we are the workspace project, we can't skip project install
      workspacePnpmPackageManager !== this &&
      // if we have a workspace pkg manager and it did install before,
      // we can skip this subproject installation
      workspacePnpmPackageManager?.didInstallRun
    ) {
      this.debug('Skipping pnpm install for subproject');
      return { stdout: 'Skipping pnpm install for subproject', stderr: '' };
    }
    this.debug('Install dependencies. Options =', opts);
    const output = this.pkgRun(
      `install${opts.frozen ? ' --frozen-lockfile' : ''}`,
    );
    this.didInstallRun = true;
    return output;
  }

  getWorkspacePnpmPackageManager() {
    const rootPkg = PackageManager.for(this.project.root);
    if (!(rootPkg instanceof PnpmPackageManager)) return null; // not pnpm package manager
    if (!rootPkg.options.workspace) return null; // not a workspace
    return rootPkg;
  }
}
