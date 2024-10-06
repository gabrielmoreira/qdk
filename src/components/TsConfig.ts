import type { TsConfigJson } from 'type-fest';
import {
  AnyString,
  Component,
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

export interface TsConfigOptions {
  extends?: (TsConfigBase | AnyString)[];
  config: TsConfigJson;
  devDependencies: string[];
}
export type TsConfigInitialOptions = Omit<
  Partial<TsConfigOptions>,
  'devDependencies'
>;

export class TsConfig extends Component<TsConfigOptions> {
  json: JsonFile<TsConfigJson>;
  static defaults(
    options: TsConfigInitialOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    scope: Scope,
  ): TsConfigOptions {
    const config: TsConfigJson = options.config ?? {};

    const configExtends =
      typeof config.extends === 'string'
        ? [config.extends]
        : (config.extends ?? []);
    const optionsExtends = options.extends ?? [];

    // add options.extends to the config.extends
    config.extends = [...new Set([...configExtends, ...optionsExtends])];

    // set default config extends if no extends or no config provided
    if (!config.extends?.length && !options.config) {
      config.extends = TsConfigDefaults.extends;
    }

    // parse extends dependencies
    const devDependenciesMap: Record<string, string | undefined> = {};
    if (config.extends?.length) {
      config.extends = config.extends?.map(dependency => {
        const { name, version } = parseDependency(dependency);
        devDependenciesMap[name] = version ?? undefined;
        return name;
      });
    }
    const devDependencies = Object.entries(devDependenciesMap).map(
      ([name, version]) => (version ? `${name}@${version}` : name),
    );

    return {
      ...options,
      devDependencies,
      config,
    };
  }
  constructor(scope: Scope, options: TsConfigInitialOptions = {}) {
    const opts = TsConfig.defaults(options, scope);
    super(scope, opts);
    this.json = new JsonFile<TsConfigJson>(
      this,
      { basename: 'tsconfig.json' },
      opts.config,
    );
    if (this.options.extends?.length && this.options.config?.extends?.length) {
      this.debug(
        "Merged [...options.extends, ...config.extends]. ⚠️ Check if it's the desired behavior ⚠️",
      );
    }

    // add dependencies to the package json
    if (opts.devDependencies.length) {
      const packageJson = PackageJson.required(this);
      packageJson.addDevDeps(...opts.devDependencies);
    }
  }
}
