import { relative } from 'node:path';
import { BaseProject, PackageJson, PackageManager } from '../index.js';

export const NpmPackagerManagerDefaults = {};
interface NpmPackageManagerOptions {
  workspace?: boolean;
}
type NpmPackageManagerInitialOptions = Partial<NpmPackageManagerOptions>;

export class NpmPackageManager extends PackageManager<NpmPackageManagerOptions> {
  static defaults(
    options: NpmPackageManagerInitialOptions,
  ): NpmPackageManagerOptions {
    return {
      ...options,
    };
  }
  constructor(
    scope: BaseProject,
    options: NpmPackageManagerInitialOptions = {},
  ) {
    const opts = NpmPackageManager.defaults(options);
    super(scope, opts);
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
  async run(cmd: string) {
    return await this.exec(`npm ${cmd}`);
  }
  async install(opts: { frozen?: boolean } = {}) {
    this.debug('Install dependencies. Options =', opts);
    return await this.run(opts.frozen ? 'ci' : 'install');
  }
}
