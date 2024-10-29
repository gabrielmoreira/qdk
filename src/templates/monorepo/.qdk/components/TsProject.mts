import * as qdk from '#qdk';
import {
  NodeProject,
  NodeProjectInitialOptionsType,
  NodeProjectOptions,
  NodeProjectOptionsType,
} from './NodeProject.mjs';

/**
 * Base configuration for a TypeScript project.
 * Extends the Node.js project configuration with additional TypeScript-specific options.
 */
interface TsProjectOptionsBaseType {
  tsconfig: qdk.TsConfigInitialOptionsType; // Initial configuration for tsconfig
}

/**
 * Full options type for TypeScript projects, combining Node.js project options with TypeScript-specific options.
 */
export type TsProjectOptionsType = NodeProjectOptionsType &
  TsProjectOptionsBaseType;

/**
 * Initial options for creating a TypeScript project.
 * Partial custom TypeScript options are allowed, with default fallbacks.
 */
export type TsProjectInitialOptionsType = NodeProjectInitialOptionsType &
  Partial<TsProjectOptionsBaseType>;

/**
 * Default options for TypeScript projects.
 *
 * - `tsconfig`: Default TypeScript configuration that applies common settings such as
 * `extends` and auto-install for dev dependencies.
 */
const TsProjectDefaults = {
  tsconfig: {
    autoInstallDevDependencies: false, // Prevents automatic installation of dev dependencies by default
    extends: ['@repo/tsconfig/node.json'],
  },
} as const satisfies Partial<TsProjectOptionsType>;

/**
 * Custom options merger for TypeScript projects.
 *
 * This merger combines the initial options provided by the user with the globally managed default options
 * (from `TsProjectDefaults`) and the base Node.js project options.
 */
const tsProjectOptionsMerger: qdk.OptionsMerger<
  TsProjectOptionsType,
  TsProjectInitialOptionsType,
  typeof TsProjectDefaults
> = (initialOptions, defaults, context) => {
  return {
    ...NodeProjectOptions.getOptions(
      {
        ...defaults,
        ...initialOptions,
      },
      context,
    ),
    tsconfig: {
      ...defaults.tsconfig,
      ...initialOptions.tsconfig,
    },
  };
};

/**
 * Creates TypeScript project options by merging user-provided initial options with globally managed defaults.
 *
 * These options are globally mutable. Modifying `TsProjectOptions` will ensure that all new TypeScript project instances
 * inherit the updated values, making it easier to maintain a unified setup across multiple projects.
 */
export const TsProjectOptions = qdk.createOptions(
  'TsProjectOptions',
  TsProjectDefaults,
  tsProjectOptionsMerger,
);

/**
 * Class representing a TypeScript project in QDK.
 * Extends the Node.js project class, setting up TypeScript-related configurations such as tsconfig and dependencies.
 */
export class TsProject<
  T extends TsProjectOptionsType = TsProjectOptionsType,
> extends NodeProject<T> {
  readonly typescript: qdk.Typescript;

  /**
   * Getter for the tsconfig file managed by this project.
   *
   * @returns qdk.TsConfig - The tsconfig configuration for the project
   */
  get tsconfig(): qdk.TsConfig {
    return this.typescript.tsconfig;
  }

  /**
   * Constructor to initialize the TypeScript project.
   * Sets up TypeScript configuration, handles package.json dependencies, and configures tsconfig.
   *
   * @param scope qdk.Scope - The scope for the project
   * @param options TsProjectInitialOptionsType - Initial options passed for project setup
   */
  constructor(scope: qdk.Scope, options: TsProjectInitialOptionsType) {
    // --------------------------------------
    // Initialize the project with merged TypeScript options
    // --------------------------------------
    super(scope, TsProjectOptions.getOptions(options, { scope }));

    // --------------------------------------
    // Ensure the project depends on the shared tsconfig in the monorepo
    // --------------------------------------
    qdk.PackageJson.required(this).addDeps(
      `@repo/tsconfig@${this.packageManager.formatWorkspaceVersion()}`,
    );

    // --------------------------------------
    // Setup TypeScript configuration with the provided or default options
    // --------------------------------------
    this.typescript = new qdk.Typescript(this, {
      tsconfig: this.options.tsconfig,
    });
  }
}
