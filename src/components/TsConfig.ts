import type { TsConfigJson } from 'type-fest';
import {
  AnyString,
  Component,
  DefaultOptions,
  JsonFile,
  PackageJson,
  parseDependency,
  Scope,
} from '../index.js';

export { TsConfigJson };

export const TsConfigBases = {
  Recommended: '@tsconfig/recommended',
  Bun: '@tsconfig/bun',
  CreateReactApp: '@tsconfig/create-react-app',
  Cypress: '@tsconfig/cypress',
  Deno: '@tsconfig/deno',
  Docusaurusv2: '@tsconfig/docusaurus',
  Ember: '@tsconfig/ember',
  Nextjs: '@tsconfig/next',
  NodeLTS: '@tsconfig/node-lts',
  Node10: '@tsconfig/node10',
  Node12: '@tsconfig/node12',
  Node14: '@tsconfig/node14',
  Node16: '@tsconfig/node16',
  Node17: '@tsconfig/node17',
  Node18: '@tsconfig/node18',
  Node19: '@tsconfig/node19',
  Node20: '@tsconfig/node20',
  Node21: '@tsconfig/node21',
  Node22: '@tsconfig/node22',
  Nuxt: '@tsconfig/nuxt',
  ReactNative: '@tsconfig/react-native',
  Remix: '@tsconfig/remix',
  Strictest: '@tsconfig/strictest',
  Svelte: '@tsconfig/svelte',
  Taro: '@tsconfig/taro',
  ViteReact: '@tsconfig/vite-react',
};
export const TsConfigDefaults = {
  extends: [TsConfigBases.Node20],
};
type TsConfigBase = (typeof TsConfigBases)[keyof typeof TsConfigBases];

export interface TsConfigExtra {
  tsconfigFilename: string;
  autoInstallDevDependencies?: boolean;
}
export interface TsConfigOptions extends TsConfigJson, TsConfigExtra {}
export type TsConfigInitialOptions = Omit<
  Partial<TsConfigOptions>,
  'extends'
> & {
  extends?: (TsConfigBase | AnyString) | (TsConfigBase | AnyString)[];
};

export class TsConfig extends Component<TsConfigOptions> {
  protected json: JsonFile<TsConfigJson>;
  static defaults(
    options: TsConfigInitialOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    scope: Scope,
  ): TsConfigOptions {
    const defaultOptions = DefaultOptions.getWithDefaults(TsConfig, {
      tsconfigFilename: 'tsconfig.json',
      extends: options.extends ?? TsConfigDefaults.extends,
      autoInstallDevDependencies: true,
    });
    return {
      ...defaultOptions,
      ...options,
    };
  }
  constructor(scope: Scope, options: TsConfigInitialOptions = {}) {
    const opts = TsConfig.defaults(options, scope);
    super(scope, opts);
    const { tsconfigFilename, autoInstallDevDependencies } = this.options;
    this.options.extends = this.normalizeConfigExtends(
      this.options.extends,
      autoInstallDevDependencies,
    ).configExtends;
    this.json = new JsonFile<TsConfigJson>(
      this,
      { basename: tsconfigFilename },
      this.splitConfig().tsconfig,
    );
    this.hook('synth:before', () => {
      this.normalizeConfigExtends();
    });
  }

  update(mutate: (data: TsConfigJson) => TsConfigJson | void) {
    this.json.update(data => {
      const result = this.normalizeConfigExtends(
        data.extends,
        this.options.autoInstallDevDependencies,
      );
      if (result.changed) {
        data.extends = result.configExtends;
      }
      mutate(data);
    });
  }

  protected splitConfig(): { tsconfig: TsConfigJson; options: TsConfigExtra } {
    const {
      tsconfigFilename,
      autoInstallDevDependencies,
      // Capture the remaining properties as 'tsconfig', representing valid TypeScript configuration options
      // while excluding the destructured properties above.
      ...tsconfig
      // This line destructures 'this.options' and asserts it conforms to the 'TsConfigExtra' type.
      // This ensures type safety, allowing us to verify that expected properties are defined,
      // and enabling the assert to confirm that 'tsconfig' has no remaining keys from 'TsConfigExtra'.
      // This pattern helps prevent runtime errors by enforcing correct structure and types at compile-time.
    }: TsConfigExtra = this.options;
    const options: TsConfigExtra = {
      tsconfigFilename,
      autoInstallDevDependencies,
    };

    // Ensure that after destructuring, 'tsconfig' is inferred as an empty object ({}) in TypeScript's
    // type system. The 'EnsureKeysAreNotPresent' type guarantees that no properties from 'TsConfigExtra'
    // remain in 'tsconfig', preventing accidental usage of unwanted options.
    // If new properties are added to 'TsConfigExtra', TypeScript will raise an error if not handled here,
    // ensuring updates are accurately reflected in this code.

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const assertTsConfigHasNoConfigExtraKey: EnsureKeysAreNotPresent<
      typeof tsconfig,
      keyof TsConfigExtra
    > = tsconfig;
    return { tsconfig: tsconfig as TsConfigJson, options };
  }

  protected normalizeConfigExtends(
    configExtends?: TsConfigJson['extends'],
    addDevDeps = true,
  ) {
    if (!configExtends) return { configExtends, changed: false };
    const packages =
      typeof configExtends === 'string'
        ? [configExtends]
        : (configExtends ?? []);

    const devDependenciesMap: Record<string, string | undefined> = {};
    let changed = false;
    const normalizedExtends = packages.map(dependency => {
      const { name, version } = parseDependency(dependency);
      devDependenciesMap[name] = version ?? undefined;
      if (name !== dependency) changed = true;
      return name;
    });
    // add dependencies to the package json
    if (addDevDeps) {
      const devDependencies = Object.entries(devDependenciesMap).map(
        ([name, version]) => (version ? `${name}@${version}` : name),
      );
      if (devDependencies.length) {
        const packageJson = PackageJson.required(this);
        packageJson.addDevDeps(...devDependencies);
      }
    }
    return { configExtends: normalizedExtends, changed };
  }
}

type EnsureKeysAreNotPresent<A, B> = {
  [K in keyof A]: K extends B ? never : A[K];
};
