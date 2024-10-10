import { get } from 'lodash-es';
import normalizePackageData from 'normalize-package-data';
import sortPackageJson from 'sort-package-json';
import type { PackageJson as PackageJsonType } from 'type-fest';
import {
  assertRequired,
  Component,
  DefaultOptions,
  HasOptions,
  JsonFile,
  PackageManager,
  parseDependency,
  QdkNode,
  Scope,
} from '../index.js';

export { PackageJsonType };

export type PackageJsonOptions = PackageJsonType.NodeJsStandard &
  PackageJsonType.PackageJsonStandard &
  PackageJsonType.NonStandardEntryPoints &
  PackageJsonType.TypeScriptConfiguration &
  PackageJsonType.YarnConfiguration &
  PackageJsonType.JSPMConfiguration & {
    name: string;
  };

export type PackageJsonInitialOptions = Partial<PackageJsonOptions>;

export class PackageJson
  extends Component<PackageJsonOptions>
  implements HasOptions<PackageJsonOptions>
{
  static defaults(
    options: PackageJsonInitialOptions,
    scope: Scope,
  ): PackageJsonOptions {
    const defaultOptions = DefaultOptions.getWithDefaults(PackageJson, {
      name: scope.project.options.name,
      version: scope.project.options.version ?? '0.1.0',
      description: scope.project.options.description,
    });
    return {
      ...{
        name: scope.project.options.name,
        version: scope.project.options.version,
        description: scope.project.options.description,
      },
      ...defaultOptions,
      ...options,
    };
  }
  static of(this: void, node: QdkNode): PackageJson | undefined {
    return node instanceof PackageJson ? node : undefined;
  }
  static for(this: void, scope: Scope): PackageJson | undefined {
    return scope.project.findComponent(PackageJson.of);
  }
  static required(scope: Scope): PackageJson {
    return assertRequired(
      this.for(scope),
      'PackageJson not found in the scope ' + scope.nodeType,
    );
  }
  private file: JsonFile<PackageJsonType>;

  constructor(scope: Scope, options: PackageJsonInitialOptions = {}) {
    super(scope, PackageJson.defaults(options, scope));
    this.file = new JsonFile<PackageJsonType>(
      this,
      { basename: 'package.json', readOnInit: true },
      structuredClone(this.options) as PackageJsonType,
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
