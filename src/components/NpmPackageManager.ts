import { relative } from 'node:path';
import {
  createOptions,
  OptionsMerger,
  PackageJson,
  PackageManager,
  Scope,
} from '../index.js';

interface NpmPackageManagerOptionsType {
  workspace?: boolean;
}
type NpmPackageManagerInitialOptionsType =
  Partial<NpmPackageManagerOptionsType>;

export const NpmPackagerManagerDefaults: Partial<NpmPackageManagerOptionsType> =
  {};

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

export class NpmPackageManager extends PackageManager<NpmPackageManagerOptionsType> {
  cmdPrefix = `npm`;
  execCmdPrefix = `npx`;
  constructor(scope: Scope, options: NpmPackageManagerInitialOptionsType = {}) {
    // fail if a package manager is already defined to this project
    scope.project.ensureComponentIsNotDefined(PackageManager.of);
    super(
      scope.project,
      NpmPackageManagerOptions.getOptions(options, { scope }),
    );
    if (this.options.workspace) {
      this.hook('synth:before', () => {
        PackageJson.required(this).update(data => {
          data.workspaces = this.project.subprojects.map(project =>
            relative(this.project.options.path, project.options.path),
          );
        });
      });
    }
  }

  async install(opts: { frozen?: boolean } = {}) {
    this.debug('Install dependencies. Options =', opts);
    return await this.run(opts.frozen ? 'ci' : 'install');
  }
}
