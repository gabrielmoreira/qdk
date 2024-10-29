import { relative } from 'node:path';
import {
  createOptions,
  OptionsMerger,
  PackageJson,
  PackageManager,
  Scope,
} from '../index.mjs';

interface NpmPackageManagerOptionsType {
  workspace: boolean;
  version: string;
}
type NpmPackageManagerInitialOptionsType =
  Partial<NpmPackageManagerOptionsType>;

export const NpmPackagerManagerDefaults = {
  workspace: false,
  version: '10.9.0',
} satisfies NpmPackageManagerOptionsType;

const optionsMerger: OptionsMerger<
  NpmPackageManagerOptionsType,
  NpmPackageManagerInitialOptionsType,
  typeof NpmPackagerManagerDefaults
> = (initialOptions, defaults) => {
  return {
    ...defaults,
    ...initialOptions,
  };
};

export const NpmPackageManagerOptions = createOptions(
  'NpmPackageManagerOptions',
  NpmPackagerManagerDefaults,
  optionsMerger,
);

export class NpmPackageManager extends PackageManager<
  NpmPackageManagerOptionsType,
  NpmPackageManagerInitialOptionsType
> {
  type = 'npm';
  cmdPrefix = `npm`;
  execCmdPrefix = `npx`;

  formatWorkspaceVersion(version?: string): string {
    return version ?? '*';
  }

  async setup() {
    // no need to setup npm (except if we wanted to fix a version)
  }

  protected isCorepackInstalledForWorkspace(): boolean {
    return true;
  }

  createSubprojectInstance(
    scope: Scope,
    options?: NpmPackageManagerInitialOptionsType,
  ): this {
    return new NpmPackageManager(scope, options) as this;
  }
  constructor(scope: Scope, options: NpmPackageManagerInitialOptionsType = {}) {
    // fail if a package manager is already defined to this project
    scope.project.ensureComponentIsNotDefined(PackageManager.of);
    super(
      scope.project,
      NpmPackageManagerOptions.getOptions(options, { scope }),
    );
    this.hook('synth:before', () => {
      const pkg = PackageJson.required(this);
      pkg.setPackageManager('npm', this.options.version);
      if (this.options.workspace) {
        pkg.update(data => {
          data.workspaces = this.project.subprojects.map(project =>
            relative(this.project.options.path, project.options.path),
          );
        });
      }
    });
  }

  async install(opts: { frozen?: boolean } = {}) {
    this.debug('Install dependencies. Options =', opts);
    return await this.pkgRun(opts.frozen ? 'ci' : 'install');
  }
}
