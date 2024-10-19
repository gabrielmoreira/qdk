import * as qdk from 'qdk';
import { NodeProject } from './NodeProject.js';
import {
  TsProjectInitialOptionsType,
  TsProjectOptions,
  TsProjectOptionsType,
} from './TsProject.js';

interface ReactNativeAppProjectOptionsBaseType {
  packageName: string;
}
export type ReactNativeAppProjectOptionsType = TsProjectOptionsType &
  ReactNativeAppProjectOptionsBaseType;
export type ReactNativeAppProjectInitialOptionsType =
  TsProjectInitialOptionsType & Partial<ReactNativeAppProjectOptionsBaseType>;

const ReactNativeAppProjectDefaults = {
  basedir: 'apps/',
  tsconfig: {
    extends: ['@repo/tsconfig/react-native.json'],
  },
  packageName: 'com.example.app',
  packageJson: {
    type: 'commonjs',
    scripts: {
      android: 'react-native run-android',
      ios: 'react-native run-ios',
      lint: 'eslint .',
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
      '@types/react': '^18.2.6',
      '@types/react-test-renderer': '^18.0.0',
      'babel-jest': '^29.6.3',
      eslint: '^8.19.0',
      jest: '^29.6.3',
      prettier: '2.8.8',
      'react-test-renderer': '18.3.1',
      typescript: '5.0.4',
    },
  },
} satisfies Partial<ReactNativeAppProjectOptionsType>;

const reactNativeAppOptionsMerger: qdk.OptionsMerger<
  ReactNativeAppProjectOptionsType,
  ReactNativeAppProjectInitialOptionsType,
  typeof ReactNativeAppProjectDefaults
> = (initialOptions, defaults, context) => {
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
      context,
    ),
    packageName: initialOptions?.packageName ?? defaults.packageName,
  };
};

export const ReactNativeAppProjectOptions = qdk.createOptions(
  'ReactNativeAppProjectOptions',
  ReactNativeAppProjectDefaults,
  reactNativeAppOptionsMerger,
);

export class ReactNativeAppProject extends NodeProject<ReactNativeAppProjectOptionsType> {
  constructor(
    scope: qdk.Scope,
    options: ReactNativeAppProjectInitialOptionsType,
  ) {
    super(scope, ReactNativeAppProjectOptions.getOptions(options, { scope }));

    let created = false;
    this.hook('synth:before', async () => {
      const hasAppJson = qdk.existsSync(this.resolvePath('app.json'));
      if (!hasAppJson) {
        // Generate the react native app template
        await this.execCmd(
          `npx @react-native-community/cli@latest init "${this.name.replace(/@/g, '').replace(/[^a-zA-Z0-9]/g, '_')}" --pm npm --title "${this.name}" --package-name "${this.options.packageName}" --directory "${this.options.path}" --skip-git-init --skip-install --replace-directory false`,
          { cwd: this.root.project.options.cwd },
        );
        // Fixes for monorepo
        await this.fixNodeModulesPath(
          this.resolvePath('android/settings.gradle'),
        );
        await this.fixNodeModulesPath(
          this.resolvePath('android/app/build.gradle'),
        );
        await this.overwriteMetroConfig();
        // Install packages using pnpm
        await qdk.PackageManager.required(this).install();
        created = true;
      }
    });
    this.hook('synth:after', () => {
      if (created) {
        this.log(
          `Run [pnpm --filter ${this.name} start] to start react native`,
        );
      }
    });
  }

  protected async fixNodeModulesPath(file: string) {
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

  protected async overwriteFile(file: string, content: string) {
    await qdk.writeFile(file, content);
  }

  protected async overwriteMetroConfig() {
    await this.overwriteFile(
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
