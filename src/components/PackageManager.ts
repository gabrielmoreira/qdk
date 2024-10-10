import {
  assertRequired,
  Component,
  processCwd,
  QdkNode,
  Scope,
} from '../index.js';

export abstract class PackageManager<T = unknown> extends Component<T> {
  private _versionCache: Record<string, string> = {};
  abstract run(cmd: string): ReturnType<typeof this.exec>;
  abstract install(opts?: { frozen?: boolean }): ReturnType<typeof this.exec>;
  static of(this: void, node: QdkNode): PackageManager | undefined {
    return node instanceof PackageManager ? node : undefined;
  }
  static for(scope: Scope): PackageManager | undefined {
    return scope.project.findComponent(PackageManager.of);
  }
  static required(scope: Scope): PackageManager {
    return assertRequired(scope.project.findComponent(PackageManager.of));
  }
  latestVersion(dependencyName: string) {
    this.debug('Resolving npm latest version for', dependencyName);
    if (this._versionCache[dependencyName])
      return this._versionCache[dependencyName];
    const version = this.execSync(`npm view ${dependencyName} version`, {
      cwd: processCwd(),
    });
    this._versionCache[dependencyName] = version;
    return version;
  }
}
