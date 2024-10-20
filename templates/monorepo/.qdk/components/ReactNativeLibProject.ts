import * as qdk from 'qdk';
import { NodeProject } from './NodeProject.js';
import {
  TsProjectInitialOptionsType,
  TsProjectOptions,
  TsProjectOptionsType,
} from './TsProject.js';

/**
 * Base options for creating a React Native library.
 * Includes settings for languages, type of module, example app, and version control.
 */
interface ReactNativeLibProjectOptionsBaseType {
  // Languages you want to use
  languages: 'kotlin-swift' | 'kotlin-objc' | 'cpp' | 'js' | qdk.AnyString;

  // Type of library you want to develop
  type:
    | 'library'
    | 'module-legacy'
    | 'view-legacy'
    | 'module-mixed'
    | 'module-new'
    | 'view-mixed'
    | 'view-new'
    | qdk.AnyString;

  // Type of the example app to create
  example: 'vanilla' | 'test-app' | 'expo' | qdk.AnyString;

  // Version of React Native to use
  reactNativeVersion: string;

  // Version of the create-react-native-library template to use
  createReactNativeLibraryVersion: string;
}

// Full options, combining TypeScript project options with React Native library-specific options
export type ReactNativeLibProjectOptionsType = TsProjectOptionsType &
  ReactNativeLibProjectOptionsBaseType;

// Initial options provided by the user during project setup, with partial options for customization
export type ReactNativeLibProjectInitialOptionsType =
  TsProjectInitialOptionsType & Partial<ReactNativeLibProjectOptionsBaseType>;

/**
 * Internal default options for React Native library projects.
 * These serve as the starting configuration for all React Native libraries.
 * - Can be changed through ReactNativeLibProjectOptions.
 * - It provides a baseline configuration that can be customized via the merger.
 */
const ReactNativeLibProjectDefaults = {
  // Create library options
  type: 'module-legacy',
  example: 'vanilla',
  languages: 'kotlin-swift',
  reactNativeVersion: '0.75.4',
  createReactNativeLibraryVersion: '0.42.0',
  // Project defaults
  basedir: 'packages/',
  tsconfig: {
    extends: ['@repo/tsconfig/react-native.json'],
  },
  packageJson: {
    type: 'commonjs',
    source: './src/index.tsx',
    main: './lib/commonjs/index.js',
    module: './lib/module/index.js',
    exports: {
      '.': {
        import: {
          types: './lib/typescript/module/src/index.d.ts',
          default: './lib/module/index.js',
        },
        require: {
          types: './lib/typescript/commonjs/src/index.d.ts',
          default: './lib/commonjs/index.js',
        },
      },
    },
    files: [
      'src',
      'lib',
      'android',
      'ios',
      'cpp',
      '*.podspec',
      'react-native.config.json',
      '!ios/build',
      '!android/build',
      '!android/gradle',
      '!android/gradlew',
      '!android/gradlew.bat',
      '!android/local.properties',
      '!**/__tests__',
      '!**/__fixtures__',
      '!**/__mocks__',
      '!**/.*',
    ],
    scripts: {
      test: 'jest',
      typecheck: 'tsc',
      clean:
        'del-cli android/build example/android/build example/android/app/build example/ios/build lib',
      prepare: 'bob build',
      build: 'bob build',
    },
    devDependencies: {
      '@types/jest': '^29.5.5',
      '@types/react': '^18.2.44',
      'del-cli': '^5.1.0',
      'react-native-builder-bob': '^0.30.2',
      'react-native': '0.75.4',
      jest: '^29.7.0',
      react: '18.3.1',
    },
    peerDependencies: {
      react: '*',
      'react-native': '*',
    },
    jest: {
      preset: 'react-native',
      modulePathIgnorePatterns: [
        '<rootDir>/example/node_modules',
        '<rootDir>/lib/',
      ],
    },
    'react-native-builder-bob': {
      source: 'src',
      output: 'lib',
      targets: [
        [
          'commonjs',
          {
            esm: true,
          },
        ],
        [
          'module',
          {
            esm: true,
          },
        ],
        [
          'typescript',
          {
            project: 'tsconfig.build.json',
            esm: true,
          },
        ],
      ],
    },
  },
} satisfies Partial<ReactNativeLibProjectOptionsType>;

/**
 * Merger function for React Native library options.
 * Combines internal defaults with user-provided options and TypeScript project settings.
 * This allows customizable project setup while retaining important default values.
 */
const reactNativeLibraryOptionsMerger: qdk.OptionsMerger<
  ReactNativeLibProjectOptionsType,
  ReactNativeLibProjectInitialOptionsType,
  typeof ReactNativeLibProjectDefaults
> = (initialOptions, defaults, context) => {
  return {
    ...defaults,
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
      context,
    ),
  };
};

// Exported options for setting up a React Native library project, globally modifiable
export const ReactNativeLibProjectOptions = qdk.createOptions(
  'ReactNativeLibProjectOptions',
  ReactNativeLibProjectDefaults,
  reactNativeLibraryOptionsMerger,
);

/**
 * Class for managing a React Native library project.
 * Handles the creation of the project structure, template generation, and package management.
 */
export class ReactNativeLibProject extends NodeProject<ReactNativeLibProjectOptionsType> {
  constructor(
    scope: qdk.Scope,
    options: ReactNativeLibProjectInitialOptionsType,
  ) {
    super(scope, ReactNativeLibProjectOptions.getOptions(options, { scope }));

    // Ensure necessary dev dependencies are installed
    qdk.PackageJson.required(this).addDevDeps('del-cli');

    let templateGenerated = false;

    // Hook before the synthesis step to potentially generate the project template
    this.hook('synth:before', async () => {
      templateGenerated = await this.generateAppTemplateIfNeeded();
    });

    // Hook after the synthesis step to notify about template generation completion
    this.hook('synth:after', async () => {
      if (templateGenerated) {
        // The initial template generation only happens
        // if the project doesn't already exist.
        // That's why we trigger a special hook here: "onTemplateGenerated"
        await this.callHook('onTemplateGenerated');
        this.log(
          qdk.chalk.green(`React Native library ${this.name} generated`),
        );
      }
    });
  }

  /**
   * Generates the react native library based on a template if it doesn't already exist.
   * This process is skipped if a `babel.config.js` file is found.
   */
  protected async generateAppTemplateIfNeeded() {
    // If the babel.config.js file exists, we will skip the template generation
    const projectAlreadyExists = qdk.existsSync(
      this.resolvePath('babel.config.js'),
    );
    if (projectAlreadyExists) return false;

    const version = this.options.createReactNativeLibraryVersion;

    const args: string[] = [`npx create-react-native-library@${version}`];
    // Configure the library generation arguments based on user options
    // set the output directory (relative to the workspace root project)
    args.push(
      this.root.project.relativeTo(this.options.path).replace('./', ''),
    );
    // use custom directories instead of current directory
    args.push('--no-local');
    // set the project name
    args.push(
      '--slug',
      this.name.replace(/@/g, '').replace(/[^a-zA-Z0-9]/g, '_'),
    );
    args.push('--react-native-version', this.options.reactNativeVersion);
    args.push('--example', this.options.example);
    args.push('--type', this.options.type);
    args.push('--languages', this.options.languages);
    args.push(`--description "empty"`);
    args.push(`--author-name "empty"`);
    args.push(`--author-email "empty@empty.com"`);
    args.push(`--repo-url "https://empty"`);
    args.push(`--author-url "https://empty"`);
    const cmd = args.join(' ');

    // Generate the react native app template
    await this.execCmd(cmd, { cwd: this.root.project.options.cwd });

    // Get a reference to our package manager (pnpm)
    const pkg = qdk.PackageManager.required(this);

    // Clean up unnecessary files generated by the template
    await pkg.exec(
      'del-cli .yarn .yarnrc.yml example turbo.json lefthook.yml CODE_OF_CONDUCT.md CONTRIBUTING.md .editorconfig .github LICENSE',
    );

    return true;
  }
}
