export const simple = () =>
  `
import {
  Component,
  EsLint,
  NpmPackageManager,
  PackageJson,
  PackageManager,
  Project,
  QdkApp,
  SampleFiles,
  Scope,
  TsConfigBases,
  Typescript,
} from 'qdk';

export default class MyApp extends QdkApp {
  constructor({ cwd }: { cwd: string }) {
    super();
    // Create a new empty project

    const myProject = this.add(
      Project.create({
        name: 'qdk-sample',
        description: 'Sample QDK Project',
        version: '0.1.0',
        cwd,
        // outdir: 'some-other-folder', // by default outdir is '.' (same as cwd)
      }),
    );

    // Use npm package manager
    new NpmPackageManager(myProject);

    // Customize package.json and add custom dependencies
    new PackageJson(myProject, {
      license: 'MIT',
      module: \`\${myProject.buildDir}/src/index.js\`,
    }) // by default the package type is 'module'
      .addDevDeps('vitest')
      .setScript('test', 'vitest');

    // Typescript TSConfig
    new Typescript(myProject, {
      tsconfig: {
        extends: [TsConfigBases.Node20],
        include: [
          'qdk.config.ts',
          'eslint.config.mjs',
          ...(myProject.sourceSets.main?.pattern ?? []),
          ...(myProject.sourceSets.tests?.pattern ?? []),
          ...(myProject.sourceSets.qdk?.pattern ?? []),
        ],
        compilerOptions: {
          outDir: myProject.buildDir,
          strictNullChecks: true,
          resolveJsonModule: true,
        },
      },
    });

    // Enable ESLint (+ prettier)
    new EsLint(myProject, {
      templateParams: {
        rules: {
          '@typescript-eslint/no-unsafe-call': 'off',
        },
      },
    });

    // To automatically run linting after synthesizing the project,
    // use the following hook. This ensures ESLint fixes any issues:
    this.hook('synth:after', async () => {
      await PackageManager
        // Find the package manager configured for this project
        .required(myProject)
        // Run: npx eslint --fix to automatically correct linting issues
        .exec('eslint --fix');
    });

    // You can extract your features into components
    // to enable reuse across different projects.
    new MySampleFiles(myProject);
  }
}

export class MySampleFiles extends Component {
  constructor(scope: Scope) {
    super(scope, undefined);

    // Sample files
    new SampleFiles(this, {
      files: {
        // src/index.ts
        'src/index.ts': \`import { name } from './config.json';
    
    export const sayHello = () => 'Hello ' + name\`,
        // src/config.ts
        'src/config.json': {
          type: 'json',
          options: {},
          data: { name: 'Alice ' + new Date().toISOString() },
        },
        // Test file
        'test/index.spec.ts': \`
import { describe, expect, it } from 'vitest';
import { sayHello } from '../src/index.js';

describe('index', () => {
it('say hello', () => {
// When
const result = sayHello();
// Then
expect(result).toMatch(/^Hello Alice .+$/g);
});
});
\`,
      },
    });
  }
}

`.trim() + '\n';

export const monorepo = () => `import {
  BaseProject,
  BaseProjectInitialOptionsType,
  BaseProjectOptions,
  BaseProjectOptionsType,
  createOptionsManager,
  IniFile,
  JsonifiableObject,
  OptionsMerger,
  PackageJson,
  PackageJsonInitialOptions,
  PackageJsonOptions,
  PnpmPackageManager,
  Project,
  QdkApp,
  Scope,
  TsConfig,
  TsConfigInitialOptionsType,
  Typescript,
} from 'qdk';

export default class MyApp extends QdkApp {
  constructor({ cwd }: { cwd: string }) {
    super();

    // Set some nice defaults for all instances of a PackageJson
    PackageJsonOptions.updateDefaults((pkg) => {
      pkg.author = {
        name: 'Gabriel Moreira',
      };
      pkg.private = true;
      pkg.license = 'MIT';
    });

    // Create a new empty project
    const monorepo = this.add(
      MonorepoProject.create({
        name: '@repo/root',
        description: 'Sample QDK Project',
        version: '0.1.0',
        cwd,
        npmrc: {
          // react native projects requires node-linker=hoisted on pnpm project
          'node-linker': 'hoisted',
        },
      })
    );

    const myApp = new ReactNativeAppProject(monorepo, {
      name: '@repo/my-app',
    });

    const myOtherApp = new ReactNativeAppProject(monorepo, {
      name: '@repo/some-other-app',
    });

    // Node Library Project has not
    const myLibA = new NodeProject(monorepo, {
      name: '@repo/my-lib-a',
      outdir: 'packages/my-lib-a',
      gitignore: false,
    });

    const myLibB = new TsProject(monorepo, {
      name: '@repo/my-lib-b',
    });
    myLibB.addDeps(myLibA);

    const myLibC = new TsProject(monorepo, {
      name: '@repo/my-lib-c',
      packageJson: {
        author: 'Gabriel Moreira',
      },
    });

    const tsconfigShared = new NodeProject(monorepo, {
      name: '@repo/tsconfig',
      outdir: 'shared/tsconfig',
    });
    new TsConfig(tsconfigShared, {
      tsconfigFilename: 'node.json',
      extends: ['@tsconfig/node20'],
    });
    new TsConfig(tsconfigShared, {
      tsconfigFilename: 'react-native.json',
      extends: ['@tsconfig/react-native'],
    });
  }
}

function getNameWithoutScope(name: string) {
  if (name[0] === '@') {
    return name.split('/').pop();
  }
  return name;
}

// Move the code below to its own file. E.g: qdk/NodeProject.ts

type NodeProjectOptionsBaseType = {
  packageJson?: PackageJsonInitialOptions;
  tsconfig?: TsConfigInitialOptionsType;
  basedir?: string;
};
export type NodeProjectOptionsType = BaseProjectOptionsType & NodeProjectOptionsBaseType;
export type NodeProjectInitialOptionsType = BaseProjectInitialOptionsType & Partial<NodeProjectOptionsBaseType>;
const NodeProjectDefaults = {
  basedir: 'packages/',
  gitignore: false,
  tsconfig: {
    autoInstallDevDependencies: false,
    extends: ['@repo/tsconfig/node.json'],
  },
} satisfies Partial<NodeProjectOptionsType>;

const nodeProjectOptionsMerger: OptionsMerger<NodeProjectOptionsType, NodeProjectInitialOptionsType, typeof NodeProjectDefaults> = (initialOptions, defaults, context) => {
  return {
    ...BaseProjectOptions.getOptions(
      {
        ...defaults,
        ...initialOptions,
        name: initialOptions.name,
        outdir: initialOptions.outdir ?? (initialOptions.basedir ?? defaults.basedir) + getNameWithoutScope(initialOptions.name),
        gitignore: initialOptions.gitignore ?? defaults.gitignore,
      },
      context
    ),
  };
};

const NodeProjectOptions = createOptionsManager(Symbol.for('NodeProjectOptions'), NodeProjectDefaults, nodeProjectOptionsMerger);

export class NodeProject<
  T extends NodeProjectOptionsType = NodeProjectOptionsType,
  I extends NodeProjectInitialOptionsType = NodeProjectInitialOptionsType,
> extends BaseProject<T> {
  readonly packageManager: PnpmPackageManager;
  readonly packageJson: PackageJson;
  readonly typescript: Typescript;
  get tsconfig(): TsConfig {
    return this.typescript.tsconfig;
  }
  protected normalizeDeps(...deps: (string | BaseProject)[]) {
    return deps.map((dep) => {
      if (dep instanceof BaseProject) {
        return dep.name + '@workspace:*';
      }
      return dep;
    });
  }
  addDeps(...deps: (string | Project)[]) {
    this.packageJson.addDeps(...this.normalizeDeps(...deps));
    return this;
  }
  addDevDeps(...deps: (string | Project)[]) {
    this.packageJson.addDevDeps(...this.normalizeDeps(...deps));
    return this;
  }
  addPeerDeps(...deps: (string | Project)[]) {
    this.packageJson.addPeerDeps(...this.normalizeDeps(...deps));
    return this;
  }
  addOptionalDeps(...deps: (string | Project)[]) {
    this.packageJson.addOptionalDeps(...this.normalizeDeps(...deps));
    return this;
  }
  constructor(scope: Scope, options: I) {
    super(scope, NodeProjectOptions.getOptions(options, { scope }) as T);
    this.packageManager = new PnpmPackageManager(this);
    this.packageJson = new PackageJson(this, this.options.packageJson).addDeps('@repo/tsconfig@workspace:*');
    this.typescript = new Typescript(this, {
      tsconfig: {
        ...this.options.tsconfig,
        autoInstallDevDependencies: this.options.tsconfig?.autoInstallDevDependencies ?? false,
        extends: this.options.tsconfig?.extends ?? ['@repo/tsconfig/node.json'],
      },
    });
  }
}
// Move the code below to its own file. E.g: qdk/TsProject.ts

type TsProjectOptionsBaseType = {};
export type TsProjectOptionsType = NodeProjectOptionsType & TsProjectOptionsBaseType;
export type TsProjectInitialOptionsType = NodeProjectInitialOptionsType & Partial<TsProjectOptionsBaseType>;

const TsProjectDefaults = {
  tsconfig: {
    extends: ['@repo/tsconfig/node.json'],
  },
} satisfies Partial<TsProjectOptionsType>;

const tsProjectOptionsMerger: OptionsMerger<TsProjectOptionsType, TsProjectInitialOptionsType, typeof TsProjectDefaults> = (initialOptions, defaults, context) => {
  return {
    ...NodeProjectOptions.getOptions(
      {
        ...defaults,
        ...initialOptions,
        tsconfig: {
          ...NodeProjectOptions.getDefaults().tsconfig,
          ...defaults.tsconfig,
          ...initialOptions.tsconfig,
        },
      },
      context
    ),
  };
};

const TsProjectOptions = createOptionsManager(Symbol.for('TsProjectOptions'), TsProjectDefaults, tsProjectOptionsMerger);

export class TsProject extends NodeProject<TsProjectOptionsType> {
  constructor(scope: Scope, options: TsProjectInitialOptionsType) {
    super(scope, TsProjectOptions.getOptions(options, { scope }));
  }
}

// Move the code below to its own file. E.g: qdk/ReactNativeAppProject.ts

type ReactNativeAppProjectOptionsBaseType = {};
export type ReactNativeAppProjectOptionsType = TsProjectOptionsType & ReactNativeAppProjectOptionsBaseType;
export type ReactNativeAppProjectInitialOptionsType = TsProjectInitialOptionsType & Partial<ReactNativeAppProjectOptionsBaseType>;

const ReactNativeAppProjectDefaults = {
  basedir: 'apps/',
  tsconfig: {
    extends: ['@repo/tsconfig/react-native.json'],
  },
} satisfies Partial<ReactNativeAppProjectOptionsType>;

const reactNativeAppOptionsMerger: OptionsMerger<ReactNativeAppProjectOptionsType, ReactNativeAppProjectInitialOptionsType, typeof ReactNativeAppProjectDefaults> = (
  initialOptions,
  defaults,
  context
) => {
  return {
    ...TsProjectOptions.getOptions(
      {
        ...defaults,
        ...initialOptions,
        tsconfig: {
          ...TsProjectOptions.getDefaults().tsconfig,
          ...defaults.tsconfig,
          ...initialOptions.tsconfig,
        },
      },
      context
    ),
  };
};

const ReactNativeAppProjectOptions = createOptionsManager(Symbol.for('ReactNativeAppProjectOptions'), ReactNativeAppProjectDefaults, reactNativeAppOptionsMerger);

export class ReactNativeAppProject extends NodeProject<ReactNativeAppProjectOptionsType> {
  constructor(scope: Scope, options: ReactNativeAppProjectInitialOptionsType) {
    super(scope, ReactNativeAppProjectOptions.getOptions(options, { scope }));
  }
}

// Move the code below to its own file. E.g: qdk/MonorepoProject.ts

type MonorepoProjectOptionsBaseType = {
  packageJson?: PackageJsonInitialOptions;
  npmrc?: JsonifiableObject;
};
export type MonorepoProjectOptionsType = BaseProjectOptionsType & MonorepoProjectOptionsBaseType;
export type MonorepoProjectInitialOptionsType = BaseProjectInitialOptionsType & MonorepoProjectOptionsBaseType;

const MonorepoProjectDefaults: Partial<MonorepoProjectOptionsType> = {
  npmrc: {},
} as const;

const merger: OptionsMerger<MonorepoProjectOptionsType, MonorepoProjectInitialOptionsType, typeof MonorepoProjectDefaults, PartialOptionsContext> = (
  initialOptions,
  defaults,
  context
) => {
  return {
    ...BaseProjectOptions.getOptions(initialOptions, context),
    ...defaults,
    npmrc: typeof initialOptions.npmrc === 'boolean' ? (initialOptions.npmrc ? defaults.npmrc : undefined) : (initialOptions.npmrc ?? defaults.npmrc),
  };
};
export const MonorepoProjectOptions = createOptionsManager(Symbol.for('MonorepoProjectOptions'), MonorepoProjectDefaults, merger);

export class MonorepoProject extends BaseProject<MonorepoProjectOptionsType> {
  static create(opts: MonorepoProjectInitialOptionsType) {
    return new MonorepoProject(MonorepoProjectOptions.getOptions(opts, {}));
  }

  constructor(options: MonorepoProjectOptionsType) {
    super(undefined, options);
    new PnpmPackageManager(this, { workspace: true });
    new PackageJson(this, this.options.packageJson);
    if (this.options.npmrc) {
      new IniFile(
        this,
        {
          basename: '.npmrc',
        },
        this.options.npmrc
      );
    }
  }
}`;

export const blank = () => `
import {
  Project,
  QdkApp,
} from 'qdk';

export default class MyApp extends QdkApp {
  constructor({ cwd }: { cwd: string }) {
    super();

    // Create a new empty project
    const project = this.add(
      Project.create({
        name: 'qdk-sample',
        description: 'Sample QDK Project',
        version: '0.1.0',
        cwd,
      }),
    );
  }
}
`;
