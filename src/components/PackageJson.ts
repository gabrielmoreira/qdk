import { get } from 'lodash-es';
import normalizePackageData from 'normalize-package-data';
import sortPackageJson from 'sort-package-json';
import type { PackageJson as PackageJsonType } from 'type-fest';
import {
  assertRequired,
  Component,
  JsonFile,
  PackageManager,
  parseDependency,
  Project,
  QdkNode,
  Scope,
} from '../index.js';

export { PackageJsonType };
export interface PackageJsonOptions {
  name: string;
  version: string;
  description: string;
}

export type PackageJsonInitialOptions = Partial<PackageJsonOptions>;
export const PackageJsonDefaults = {
  version: '0.0.1',
  description: '',
};
export class PackageJson extends Component<PackageJsonOptions> {
  static defaults(
    options: PackageJsonInitialOptions,
    scope: Project,
  ): PackageJsonOptions {
    return {
      name: scope.options.name,
      version: scope.options.version ?? PackageJsonDefaults.version,
      description: scope.options.description ?? PackageJsonDefaults.description,
      ...options,
    };
  }
  static of(node: QdkNode): PackageJson | undefined {
    return node instanceof PackageJson ? node : undefined;
  }
  static for(scope: Scope): PackageJson | undefined {
    // TODO remove following eslint disable
    // eslint-disable-next-line @typescript-eslint/unbound-method
    return scope.project.findComponent(PackageJson.of);
  }
  static required(scope: Scope): PackageJson {
    return assertRequired(
      this.for(scope),
      'PackageJson not found in the scope ' + scope.nodeType,
    );
  }
  private file: JsonFile<PackageJsonType>;
  constructor(scope: Project, options: PackageJsonInitialOptions = {}) {
    super(scope, PackageJson.defaults(options, scope));
    this.file = new JsonFile<PackageJsonType>(
      this,
      { basename: 'package.json', readOnInit: true },
      {
        name: this.options.name,
        version: this.options.version,
        description: this.options.description,
      },
    );
    this.hook('synth:before', () => {
      this.file.update(data => {
        const clonedData = JSON.parse(JSON.stringify(data)) as PackageJsonType;
        normalizePackageData(clonedData);
        return sortPackageJson(clonedData);
      });
    });
    this.hook('synth:after', async () => {
      // if (this.file.changed) {
      await PackageManager.required(this).install();
      // }
    });
  }
  private buildDepsObject(
    defaults: Partial<Record<string, string>> | undefined,
    ...dependencies: string[]
  ) {
    return dependencies.reduce(
      (deps, dependency) => {
        const { name, version } = parseDependency(dependency);
        deps[name] =
          version ??
          defaults?.[name] ??
          PackageManager.required(this).latestVersion(name);
        return deps;
      },
      {} as Record<string, string>,
    );
  }
  addDeps(...dependencies: string[]): this {
    const deps =
      get(this.file.loadedData, 'dependencies') ??
      ({} as Partial<Record<string, string>>);
    this.file.mergeField(
      'dependencies',
      this.buildDepsObject(deps, ...dependencies),
    );
    return this;
  }
  addDevDeps(...dependencies: string[]): this {
    const devDeps = get(this.file.loadedData, 'devDependencies');
    this.file.mergeField(
      'devDependencies',
      this.buildDepsObject(devDeps, ...dependencies),
    );
    return this;
  }
  addPeerDeps(...dependencies: string[]): this {
    const peerDeps = get(this.file.loadedData, 'peerDependencies');
    this.file.mergeField(
      'peerDependencies',
      this.buildDepsObject(peerDeps, ...dependencies),
    );
    return this;
  }
  setEngine(name: string, version: string): this {
    this.file.mergeField('engine', { [name]: version });
    return this;
  }
  setScript(name: string, script: string): this {
    this.file.mergeField('scripts', { [name]: script });
    return this;
  }
  update(mutate: (data: PackageJsonType) => PackageJsonType | void) {
    this.file.update(mutate);
  }
}
