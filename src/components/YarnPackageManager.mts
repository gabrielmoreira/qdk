import {
  createOptions,
  OptionsMerger,
  PackageJson,
  PackageManager,
  Scope,
  SynthOptions,
  TextFile,
} from '../index.mjs';

/**
 * Options for configuring the Yarn package manager.
 */
export interface YarnPackageManagerOptionsType {
  /**
   * The version of Yarn to use.
   */
  version: string;

  /**
   * Specifies whether to enable workspace support.
   * Can be a boolean or an array of workspace paths.
   */
  workspace: boolean | string[];

  /**
   * Indicates whether to merge the workspace fields with the subprojects paths.
   * Defaults to true.
   */
  mergeWorkspace: boolean;
}

/**
 * Initial options that can be provided for the Yarn package manager.
 */
export type YarnPackageManagerInitialOptions =
  Partial<YarnPackageManagerOptionsType>;

// Default options for Yarn package manager.
const YarnPackageManagerDefaults = {
  workspace: false, // Default to not using workspaces.
  version: '4.5.1', // Default Yarn version.
  mergeWorkspace: true, // Default to merging workspaces.
} satisfies YarnPackageManagerOptionsType;

/**
 * Merges initial options with defaults for the Yarn package manager.
 */
const optionsMerger: OptionsMerger<
  YarnPackageManagerOptionsType,
  YarnPackageManagerInitialOptions,
  typeof YarnPackageManagerDefaults
> = (initialOptions, defaults) => {
  return {
    ...defaults,
    ...initialOptions,
  };
};

// Create options for Yarn package manager with default values.
export const YarnPackageManagerOptions = createOptions(
  'YarnPackageManagerOptions',
  YarnPackageManagerDefaults,
  optionsMerger,
);

/**
 * Class representing the Yarn package manager.
 * This class handles installation of packages and configuration of Yarn workspaces.
 */
export class YarnPackageManager extends PackageManager<
  YarnPackageManagerOptionsType,
  YarnPackageManagerInitialOptions
> {
  type = 'yarn';
  cmdPrefix = `yarn`; // Command prefix for Yarn commands.
  execCmdPrefix = `yarn dlx`; // Command prefix for executing Yarn commands with `dlx`.
  private isCorepackInstalled = false;

  formatWorkspaceVersion(version?: string): string {
    return version ?? '*';
  }

  createSubprojectInstance(
    scope: Scope,
    options?: YarnPackageManagerInitialOptions,
  ): this {
    return new YarnPackageManager(scope, options) as this;
  }

  async setup() {
    // do not setup corepack pnpm if it's already there
    if (this.isCorepackInstalled) return;
    // do not setup corepack pnpm if this project is part
    // of a workspace, and the workspace root project has
    // corepack pnpm already configured
    if (this.isCorepackInstalledForWorkspace()) return;
    await this.corepackRun(`use yarn@${this.options.version}`);
    this.isCorepackInstalled = true;
  }

  protected isCorepackInstalledForWorkspace(): boolean {
    const rootPackageManager = PackageManager.for(this.project.root);
    if (this === rootPackageManager && this.options.workspace) {
      return this.isCorepackInstalled;
    }
    if (rootPackageManager) {
      if (rootPackageManager instanceof YarnPackageManager) {
        if (rootPackageManager.isCorepackInstalledForWorkspace()) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Creates an instance of the YarnPackageManager.
   * @param scope - The project scope to which this package manager belongs.
   * @param options - Initial options for configuring the package manager.
   */
  constructor(scope: Scope, options: YarnPackageManagerInitialOptions = {}) {
    // fail if a package manager is already defined to this project
    scope.project.ensureComponentIsNotDefined(PackageManager.of);
    // Retrieve options while merging with defaults.
    const opts = YarnPackageManagerOptions.getOptions(options, { scope });
    super(scope, opts, opts.version);

    // If workspace support is enabled, configure the package.json accordingly.
    if (opts.workspace) {
      this.hook('synth:before', async (synthOptions?: SynthOptions) => {
        // Set the Yarn engine version in the package.json for consistency.
        PackageJson.required(this).setPackageManager(
          'yarn',
          this.options.version,
        );

        // Determine the workspaces to include.
        let workspaces: string[];

        // Check if workspace is a boolean or an array.
        if (typeof this.options.workspace === 'boolean') {
          workspaces = []; // If it's a boolean and true, we'll handle this case below.
        } else {
          // If it's an array, use it directly.
          workspaces = this.options.workspace;
        }
        // Use subprojects as workspaces
        const projectWorkspaces = scope.project.subprojects.map(project =>
          this.project.relativeTo(project.options.path),
        );

        // If mergeWorkspace is true, merge subprojects with the provided workspaces.
        if (this.options.mergeWorkspace) {
          workspaces = [...projectWorkspaces, ...workspaces];
        }

        // Update the package.json to specify workspaces.
        PackageJson.required(this).update(data => {
          data.workspaces = workspaces;
        });

        if (!synthOptions?.checkOnly) {
          // Workaround for: The nearest package directory doesn't seem to be part of the project
          // https://github.com/yarnpkg/berry/issues/2212#issue-757069944
          await new TextFile(
            this,
            {
              basename: 'yarn.lock',
              sample: true,
            },
            '',
          ).write();
        }
      });
    }
  }

  /**
   * Installs dependencies for the project.
   * @param opts - Options for installation, such as frozen lockfile.
   * @returns A promise that resolves when the installation is complete.
   */
  async install(opts: { frozen?: boolean } = {}) {
    this.debug('Install dependencies. Options =', opts);
    // Run the installation command with or without the frozen lockfile option.
    return this.pkgRun(`install${opts.frozen ? ' --frozen-lockfile' : ''}`);
  }
}
