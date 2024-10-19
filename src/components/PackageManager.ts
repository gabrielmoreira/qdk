import {
  assertRequired,
  Component,
  processCwd,
  QdkNode,
  Scope,
} from '../index.js';

export abstract class PackageManager<T = unknown> extends Component<T> {
  private _versionCache: Record<string, string> = {};
  abstract cmdPrefix: string;
  abstract execCmdPrefix: string;
  abstract install(opts?: {
    frozen?: boolean;
  }): ReturnType<typeof this.execCmd>;
  static of(this: void, node: QdkNode): PackageManager | undefined {
    return node instanceof PackageManager ? node : undefined;
  }
  static for(scope: Scope): PackageManager | undefined {
    return scope.project.findComponent(PackageManager.of);
  }
  static required(scope: Scope): PackageManager {
    return assertRequired(
      scope.project.findComponent(PackageManager.of),
      `We couldn't find any package manager on the project ${scope.project.nodeName}.`,
    );
  }
  async run(cmd: string) {
    return await this.execCmd(`${this.cmdPrefix} ${cmd}`);
  }
  async exec(cmd: string) {
    return await this.execCmd(`${this.execCmdPrefix} ${cmd}`);
  }
  latestVersion(dependencyName: string) {
    this.debug('Resolving npm latest version for', dependencyName);
    if (this._versionCache[dependencyName])
      return this._versionCache[dependencyName];
    const version = this.execSyncCmd(`npm view ${dependencyName} version`, {
      cwd: processCwd(),
    });
    this._versionCache[dependencyName] = version;
    return version;
  }
}
