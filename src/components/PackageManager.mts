import {
  assertRequired,
  Component,
  mkdir,
  processCwd,
  QdkNode,
  Scope,
  SynthOptions,
} from '../index.mjs';

let _packageVersionCache: Record<string, string> = {};

export const clearPackageVersionCache = () => (_packageVersionCache = {});

export const clearPackageVersionCacheEntry = (name: string) =>
  delete _packageVersionCache[name];

export abstract class PackageManager<T = unknown, Y = T> extends Component<T> {
  abstract type: string;
  abstract cmdPrefix: string;
  abstract execCmdPrefix: string;
  abstract install(opts?: { frozen?: boolean }): ReturnType<typeof this.runCmd>;
  abstract createSubprojectInstance(scope: Scope, options?: Y): this;
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

  constructor(scope: Scope, options: T, nodeName?: string) {
    super(scope, options, nodeName);
    this.hook('synth:before', async (options?: SynthOptions) => {
      if (!options?.checkOnly) {
        await this.traceAsyncCall('mkdir', async () => {
          await mkdir(this.project.path, { recursive: true });
        });
        await this.traceAsyncCall('setup', async () => {
          await this.setup();
        });
      }
    });
  }

  abstract formatWorkspaceVersion(version?: string): string;

  abstract setup(): Promise<void>;

  protected abstract isCorepackInstalledForWorkspace(): boolean;

  async corepackRun(cmd: string) {
    return this.traceAsyncCall(`corepackRun(${cmd})`, () => {
      return this.runCmd(`npx corepack ${cmd}`);
    });
  }

  async pkgRun(cmd: string) {
    return this.traceAsyncCall(`pkgRun(${cmd})`, () => {
      return this.runCmd(`${this.cmdPrefix} ${cmd}`);
    });
  }
  async pkgExec(cmd: string) {
    return this.traceAsyncCall(`pkgExec(${cmd})`, () => {
      return this.runCmd(`${this.execCmdPrefix} ${cmd}`);
    });
  }

  latestVersion(
    dependencyName: string,
    { forceUpdate }: { forceUpdate: boolean } = { forceUpdate: false },
  ) {
    return this.traceSyncCall('latestVersion', () => {
      this.debug('Resolving npm latest version for', dependencyName);
      if (!forceUpdate && _packageVersionCache[dependencyName])
        return _packageVersionCache[dependencyName];
      try {
        const version = this.runSyncCmd(`npm view ${dependencyName} version`, {
          cwd: processCwd(),
        });
        _packageVersionCache[dependencyName] = version;
        return version;
      } catch (e) {
        this.warn('Could not find the latest version for', dependencyName, e);
        return '*';
      }
    });
  }
}
