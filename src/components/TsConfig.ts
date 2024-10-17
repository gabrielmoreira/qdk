import { parse, ParseError } from 'jsonc-parser';
import type { TsConfigJson } from 'type-fest';
import {
  AnyString,
  Component,
  createOptionsManager,
  FileCodec,
  JsonFile,
  OptionsMerger,
  PackageJson,
  PackageJsonOptions,
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

type TsConfigBase = (typeof TsConfigBases)[keyof typeof TsConfigBases];

export interface TsConfigExtraOptionsType {
  tsconfigFilename: string;
  autoInstallDevDependencies?: boolean;
}
export interface TsConfigOptionsType
  extends TsConfigJson,
    TsConfigExtraOptionsType {}

export type TsConfigInitialOptionsType = Omit<
  Partial<TsConfigOptionsType>,
  'extends'
> & {
  extends?: (TsConfigBase | AnyString) | (TsConfigBase | AnyString)[];
};

const TsConfigDefaults = {
  tsconfigFilename: 'tsconfig.json',
  autoInstallDevDependencies: true,
  extends: [TsConfigBases.Node20],
} satisfies TsConfigOptionsType;

PackageJsonOptions.setDefaultVersions({
  '@tsconfig/node20': '^20.1.4',
});

const optionsMerger: OptionsMerger<
  TsConfigOptionsType,
  TsConfigInitialOptionsType,
  typeof TsConfigDefaults
> = (initialOptions, defaults) => {
  return {
    ...defaults,
    ...initialOptions,
  };
};

export const TsConfigOptions = createOptionsManager(
  Symbol.for('TsConfigOptions'),
  TsConfigDefaults,
  optionsMerger,
);

export class TsConfigJsonFile extends JsonFile<TsConfigJson> {
  protected createCodec(): FileCodec<TsConfigJson> {
    const codec = super.createCodec();
    return {
      decode: buffer => {
        const errors: ParseError[] = [];
        const result = parse(buffer.toString('utf8'), errors) as TsConfigJson;
        if (errors.length) {
          throw new Error('Parser error: ' + JSON.stringify(errors));
        }
        return result;
      },
      encode: codec.encode,
    };
  }
}
export class TsConfig extends Component<TsConfigOptionsType> {
  readonly file: TsConfigJsonFile;

  constructor(scope: Scope, options: TsConfigInitialOptionsType = {}) {
    super(scope, TsConfigOptions.getOptions(options, { scope }));
    const { tsconfigFilename, autoInstallDevDependencies } = this.options;
    this.options.extends = this.normalizeConfigExtends(
      this.options.extends,
      autoInstallDevDependencies,
    ).configExtends;
    this.file = new TsConfigJsonFile(
      this,
      { basename: tsconfigFilename },
      this.splitConfig().tsconfig,
    );
    this.hook('synth:before', () => {
      this.normalizeConfigExtends();
    });
  }

  update(mutate: (data: TsConfigJson) => TsConfigJson | void) {
    this.file.update(data => {
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

  protected splitConfig(): {
    tsconfig: TsConfigJson;
    options: TsConfigExtraOptionsType;
  } {
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
    }: TsConfigExtraOptionsType = this.options;
    const options: TsConfigExtraOptionsType = {
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
      keyof TsConfigExtraOptionsType
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
