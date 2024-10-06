/* eslint-disable @typescript-eslint/unbound-method */
import {
  assertRequired,
  Component,
  processCwd,
  QdkNode,
  Scope,
} from '../index.js';

export abstract class PackageManager<T = unknown> extends Component<T> {
  abstract run(cmd: string): ReturnType<typeof this.exec>;
  abstract install(opts?: { frozen?: boolean }): ReturnType<typeof this.exec>;
  static of(node: QdkNode): PackageManager | undefined {
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
    return this.execSync(`npm view ${dependencyName} version`, {
      cwd: processCwd(),
    });
  }
}
