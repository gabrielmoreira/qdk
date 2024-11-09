import { get } from 'lodash-es';
import normalizePackageData from 'normalize-package-data';
import sortPackageJson from 'sort-package-json';
import type { PackageJson as PackageJsonType } from 'type-fest';
import {
  AnyString,
  assertRequired,
  Component,
  createOptions,
  HasOptions,
  JsonFile,
  OptionsMerger,
  PackageManager,
  parseDependency,
  QdkNode,
  Scope,
} from '../index.mjs';

export { PackageJsonType };

type PackageJsonOptionsTypeWithoutRoot = PackageJsonType.NodeJsStandard &
  PackageJsonType.PackageJsonStandard &
  PackageJsonType.NonStandardEntryPoints &
  PackageJsonType.TypeScriptConfiguration &
  PackageJsonType.YarnConfiguration &
  PackageJsonType.JSPMConfiguration & {
    name: string;
    defaultVersions: Record<string, string>;
    defaultScripts: Record<string, string>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } & Record<AnyString, any>;

type PackageJsonOptionsType = PackageJsonOptionsTypeWithoutRoot & {
  rootOptions?: Pick<
    Partial<PackageJsonOptionsTypeWithoutRoot>,
    'defaultScripts'
  > & {
    devDeps?: Record<string, string | boolean | undefined>;
  };
};

export type PackageJsonInitialOptions = Partial<PackageJsonOptionsType>;

const PackageJsonDefaults: Partial<PackageJsonOptionsType> = {
  version: '0.1.0',
  type: 'module',
  defaultVersions: {},
  defaultScripts: {},
  rootOptions: {
    devDeps: { qdk: true },
    defaultScripts: {
      qdk: 'qdk synth',
      'qdk:check': 'qdk synth --check',
    },
  },
};

const optionsMerger: OptionsMerger<
  PackageJsonOptionsType,
  PackageJsonInitialOptions,
  typeof PackageJsonDefaults
> = (initialOptions, defaults, context) => {
  const { scope } = context;
  const rootDefaults =
    context.scope.project === context.scope.root.project
      ? {
          ...defaults?.rootOptions,
          ...initialOptions?.rootOptions,
          defaultScripts: {
            ...defaults?.rootOptions?.defaultScripts,
            ...initialOptions?.rootOptions?.defaultScripts,
          },
        }
      : { defaultScripts: {} };
  const options: PackageJsonOptionsType = {
    ...defaults,
    ...initialOptions,
    rootOptions: rootDefaults,
    defaultVersions: {
      ...defaults.defaultVersions,
      ...initialOptions.defaultVersions,
    },
    defaultScripts: {
      ...defaults.defaultScripts,
      ...initialOptions.defaultScripts,
    },
    name: initialOptions?.name ?? scope.project.options.name,
    version:
      initialOptions?.version ??
      scope.project.options.version ??
      defaults?.version,
    description:
      initialOptions?.description ?? scope.project.options.description,
  };
  return options;
};

export const PackageJsonOptions = createOptions(
  'PackageJsonOptions',
  PackageJsonDefaults,
  optionsMerger,
  {
    setDefaultVersions: (deps: Record<string, string>) => {
      PackageJsonOptions.updateDefaults(data => {
        const defaultVersions = (data.defaultVersions ??= {});
        Object.assign(defaultVersions, deps);
      });
    },
    setDefaultVersion: (name: string, version: string) => {
      PackageJsonOptions.updateDefaults(data => {
        const defaultVersions = (data.defaultVersions ??= {});
        defaultVersions[name] = version;
      });
    },
  },
);

export class PackageJson
  extends Component<PackageJsonOptionsType>
  implements HasOptions<PackageJsonOptionsType>
{
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
  readonly file: JsonFile<PackageJsonType>;

  constructor(scope: Scope, options: PackageJsonInitialOptions = {}) {
    // fail if this component already exists
    scope.project.ensureComponentIsNotDefined(PackageJson.of);
    super(scope, PackageJsonOptions.getOptions(options, { scope }));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { defaultScripts, defaultVersions, rootOptions, ...pkgData } =
      this.options;
    this.file = new JsonFile<PackageJsonType>(
      this,
      { basename: 'package.json', readOnInit: true },
      structuredClone(pkgData) as PackageJsonType,
    );
    this.addScripts(defaultScripts);
    if (this.project === scope.root.project && rootOptions) {
      if (rootOptions.defaultScripts) {
        this.addScripts(rootOptions?.defaultScripts);
      }
      if (rootOptions.devDeps) {
        Object.entries(rootOptions.devDeps).forEach(([key, value]) => {
          if (value === true) {
            this.addDevDeps(key);
          } else if (typeof value === 'string') {
            this.addDevDeps(key + '@' + value);
          }
        });
      }
    }
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

  private getDefaultVersion(name: string) {
    return this.options.defaultVersions?.[name];
  }
  private buildDepsObject(
    defaults: Partial<Record<string, string>> | undefined,
    ...dependencies: string[]
  ) {
    return dependencies.reduce(
      (deps, dependency) => {
        const { name, version } = parseDependency(dependency);
        deps[name] =
          // use explicit version if available
          version ??
          // or get from PackageJson default versions
          this.getDefaultVersion(name) ??
          // or get from the last installed version
          defaults?.[name] ??
          // or fetch the latest from npm
          PackageManager.required(this).latestVersion(name);
        // console.log(name, deps[name]);
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
  addOptionalDeps(...dependencies: string[]): this {
    const devDeps = get(this.file.loadedData, 'optionalDependencies');
    this.file.mergeField(
      'optionalDependencies',
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
  setPackageManager(name: string, version: string): this {
    this.file.update(pkg => {
      pkg.packageManager = `${name}@${version}`;
    });
    return this;
  }
  setScript(name: string, script: string | undefined): this {
    return this.addScripts({ [name]: script });
  }
  addScripts(scripts: Record<string, string | undefined>): this {
    return this.update(data => {
      const dataScripts = (data.scripts ??= {});
      Object.entries(scripts).forEach(([key, value]) => {
        if (value === undefined) {
          delete dataScripts[key];
        } else {
          dataScripts[key] = value;
        }
      });
    });
  }
  update(mutate: (data: PackageJsonType) => PackageJsonType | void): this {
    this.file.update(mutate);
    return this;
  }
}
