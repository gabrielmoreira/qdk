import * as qdk from 'qdk';
import { NodeProject } from './NodeProject.js';
import {
  TsProjectInitialOptionsType,
  TsProjectOptions,
  TsProjectOptionsType,
} from './TsProject.js';

/**
 * Base configuration for a React Native App project.
 * Contains essential settings like `appId` and React Native CLI version.
 */
interface ReactNativeAppProjectOptionsBaseType {
  appId: string; // Application identifier (Android package name / iOS bundle id)
  reactNativeCommunityCliVersion: string; // Version of the React Native CLI to use
}

/**
 * Full options for React Native App projects, combining TypeScript options with specific React Native settings.
 */
export type ReactNativeAppProjectOptionsType = TsProjectOptionsType &
  ReactNativeAppProjectOptionsBaseType;

/**
 * Initial options for creating a React Native App project.
 * These options are partially customizable by the user during project setup.
 */
export type ReactNativeAppProjectInitialOptionsType =
  TsProjectInitialOptionsType & Partial<ReactNativeAppProjectOptionsBaseType>;

/**
 * Internal default options for React Native App projects.
 *
 * - These defaults cover important aspects like `basedir`, `appId`, `reactNativeCommunityCliVersion`, and initial package.json configuration.
 * - You can mutable these default options through `ReactNativeAppProjectOptions`.
 */
const ReactNativeAppProjectDefaults = {
  basedir: 'apps/',
  reactNativeCommunityCliVersion: '14.1.1',
  tsconfig: {
    extends: ['@repo/tsconfig/react-native.json'],
  },
  appId: 'com.example.app',
  packageJson: {
    type: 'commonjs',
    scripts: {
      android: 'react-native run-android',
      ios: 'react-native run-ios',
      start: 'react-native start',
      test: 'jest',
    },
    dependencies: {
      react: '18.3.1',
      'react-native': '0.75.4',
    },
    devDependencies: {
      '@babel/core': '^7.20.0',
      '@babel/preset-env': '^7.20.0',
      '@babel/runtime': '^7.20.0',
      '@react-native/babel-preset': '0.75.4',
      '@react-native/eslint-config': '0.75.4',
      '@react-native/metro-config': '0.75.4',
      '@react-native/typescript-config': '0.75.4',
      '@types/react-test-renderer': '^18.0.0',
      '@types/react': '^18.2.44',
      'babel-jest': '^29.6.3',
      'react-test-renderer': '18.3.1',
      jest: '^29.6.3',
    },
  },
} satisfies Partial<ReactNativeAppProjectOptionsType>;

/**
 * Merger function for React Native App options.
 *
 * Combines the internal defaults from `ReactNativeAppProjectDefaults` with user-provided initial options
 * and TypeScript project options. This allows customized app IDs and ensures the proper tsconfig
 * setup specific to React Native.
 */
const reactNativeAppOptionsMerger: qdk.OptionsMerger<
  ReactNativeAppProjectOptionsType,
  ReactNativeAppProjectInitialOptionsType,
  typeof ReactNativeAppProjectDefaults
> = (initialOptions, defaults, context) => {
  const { nameWithoutScope } = qdk.parseDependency(initialOptions.name);
  const sanitizedName = nameWithoutScope.replace(/[^a-zA-Z0-9]/g, '_');
  const defaultAppId = defaults.appId + '.' + sanitizedName;
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
    appId: (initialOptions?.appId ?? defaults.appId).replace(
      defaults.appId,
      defaultAppId,
    ),
  };
};

/**
 * React Native App project options.
 *
 * This object combines internal defaults with mutable global options.
 * The defaults here (`ReactNativeAppProjectOptions`) can be modified, allowing you to adjust configuration
 * values (like tsconfig, react native version, etc) across all new project instances globally.
 */
export const ReactNativeAppProjectOptions = qdk.createOptions(
  'ReactNativeAppProjectOptions',
  ReactNativeAppProjectDefaults,
  reactNativeAppOptionsMerger,
);

/**
 * Class representing a React Native App project in QDK.
 *
 * Extends the Node.js project class and sets up a basic React Native project structure, including generating
 * a React Native template and configuring platform-specific settings for iOS and Android.
 */
export class ReactNativeAppProject extends NodeProject<ReactNativeAppProjectOptionsType> {
  /**
   * Constructor for setting up a React Native App project.
   * Initializes the project by applying the merged options, generates a basic React Native app template,
   * and configures additional project hooks for template generation and setup.
   *
   * @param scope qdk.Scope - The scope for the project (typically for monorepo handling)
   * @param options ReactNativeAppProjectInitialOptionsType - Initial options for the project
   */
  constructor(
    scope: qdk.Scope,
    options: ReactNativeAppProjectInitialOptionsType,
  ) {
    // Apply merged options from defaults and initial options
    super(scope, ReactNativeAppProjectOptions.getOptions(options, { scope }));

    // Ensure the necessary dev dependencies are included
    qdk.PackageJson.required(this).addDevDeps('del-cli');
    let templateGenerated = false;

    // Hook to generate the React Native template before QDK synthesis
    this.hook('synth:before', async () => {
      templateGenerated = await this.generateReactNativeAppTemplate();
    });

    // Hook to trigger additional actions after QDK synthesis
    this.hook('synth:after', async () => {
      if (templateGenerated) {
        // The initial template generation only happens
        // if the project doesn't already exist.
        // That's why we trigger a special hook here: "onTemplateGenerated"
        await this.callHook('onTemplateGenerated');
        const startCommand = qdk.chalk.bgBlack.green(
          `pnpm --filter ${this.name} start`,
        );
        this.log(
          qdk.chalk.green(`Run [${startCommand}] to start react native`),
        );
      }
    });
  }

  /**
   * Generates the initial React Native app template using the provided CLI version.
   *
   * Skips template generation if the app already exists (i.e., if `app.json` is present).
   */
  protected async generateReactNativeAppTemplate() {
    // If the app.json file exists, we will skip the template generation
    const projectAlreadyExists = qdk.existsSync(this.resolvePath('app.json'));
    if (projectAlreadyExists) return false;

    const version = this.options.reactNativeCommunityCliVersion;
    const args: string[] = [`npx @react-native-community/cli@${version} init`];

    // Project name and additional arguments for CLI
    args.push(this.name.replace(/@/g, '').replace(/[^a-zA-Z0-9]/g, '_'));
    args.push('--pm npm');
    args.push('--title', `"${this.name}"`);
    args.push('--package-name', `"${this.options.appId}"`);
    args.push('--directory', `"${this.options.path}"`);
    args.push('--skip-git-init');
    args.push('--skip-install');
    args.push('--replace-directory false');

    const cmd = args.join(' ');

    // Execute the React Native template cli command
    await this.execCmd(cmd, { cwd: this.root.project.options.cwd });

    // Fix node module paths for Android to add support to monorepo workspaces
    await this.updateNodeModulesPaths(
      this.resolvePath('android/settings.gradle'),
    );
    await this.updateNodeModulesPaths(
      this.resolvePath('android/app/build.gradle'),
    );

    // Change Metro config to add support to monorepo workspaces
    await this.overwriteMetroConfig();

    // Get a reference to our package manager (pnpm)
    const pkg = qdk.PackageManager.required(this);

    // Clean up unnecessary files from the generated template
    await pkg.exec('del-cli .eslintrc.js .gitignore');

    return true;
  }

  /**
   * Updates node module paths in the specified file to work with a monorepo structure.
   *
   * @param file The file path to update
   */
  protected async updateNodeModulesPaths(file: string) {
    const original = (await qdk.readFile(file)).toString();
    const content = original
      .replace(/(['"])\.\.\/node_modules\//g, '$1../../../node_modules/')
      .replace(
        /(['"])\.\.\/\.\.\/node_modules\//g,
        '$1../../../../node_modules/',
      )
      .replace('// reactNativeDir = file', 'reactNativeDir = file')
      .replace('// codegenDir = file', 'codegenDir = file')
      .replace('// cliFile = file', 'cliFile = file');
    if (original !== content) {
      await qdk.writeFile(file, content);
    }
  }

  /**
   * Overwrites the default Metro config with custom settings for working in a monorepo.
   */
  protected async overwriteMetroConfig() {
    await qdk.writeFile(
      this.resolvePath('metro.config.js'),
      `const {getDefaultConfig} = require('@react-native/metro-config');
      const path = require('node:path');
      
      // Find the project and workspace directories
      const projectRoot = __dirname;
      const monorepoRoot = path.resolve(projectRoot, '../..');
      
      const config = getDefaultConfig(projectRoot);
      
      // 1. Watch all files within the monorepo
      config.watchFolders = [monorepoRoot];
      // 2. Let Metro know where to resolve packages and in what order
      config.resolver.nodeModulesPaths = [
        path.resolve(projectRoot, 'node_modules'),
        path.resolve(monorepoRoot, 'node_modules'),
      ];
      
      module.exports = config;`,
    );
  }
}
