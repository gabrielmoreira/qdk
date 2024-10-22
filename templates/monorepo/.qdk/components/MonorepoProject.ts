import * as qdk from 'qdk';

/**
 * Base configuration for a Monorepo project.
 * It extends qdk's base project options and
 * includes additional options like npmrc and mise.
 */
interface MonorepoProjectOptionsBaseType {
  // Initial options for your package.json
  packageJson?: qdk.PackageJsonInitialOptions;
  // Configuration for .npmrc file
  npmrc?: qdk.JsonifiableObject;
  // Configuration for .mise.toml file
  mise?: qdk.JsonifiableObject;
}

/**
 * Full options type for Monorepo projects, combining base project options with custom ones.
 */
export type MonorepoProjectOptionsType = qdk.BaseProjectOptionsType &
  MonorepoProjectOptionsBaseType;

/**
 * Initial options for creating a Monorepo project, with partial custom options.
 */
export type MonorepoProjectInitialOptionsType =
  qdk.BaseProjectInitialOptionsType & {
    packageJson?: qdk.PackageJsonInitialOptions;
    // Enable or disable the npmrc file generation.
    npmrc?: qdk.JsonifiableObject | boolean;
    // Enable or disable the mise file generation
    mise?: qdk.JsonifiableObject | boolean;
  };

/**
 * Default options for the Monorepo project.
 * By default, `.npmrc` file will be created, but empty.
 */
const MonorepoProjectDefaults: Partial<MonorepoProjectOptionsType> = {
  npmrc: {},
} as const;

/**
 * Options merger function to combine initial options, defaults, and context.
 * This ensures that the options passed during project creation are merged
 * with defaults in a consistent way.
 */
const merger: qdk.OptionsMerger<
  MonorepoProjectOptionsType,
  MonorepoProjectInitialOptionsType,
  typeof MonorepoProjectDefaults,
  qdk.PartialOptionsContext
> = (initialOptions, defaults, context) => {
  const base = {
    ...defaults,
    ...qdk.BaseProjectOptions.getOptions(
      { ...defaults, ...initialOptions },
      context,
    ),
  };
  return {
    ...base,
    npmrc: useDefaultIfTrue(initialOptions.npmrc, defaults.npmrc),
    mise: useDefaultIfTrue(initialOptions.mise, defaults.mise),
  };
};

function useDefaultIfTrue<X extends Exclude<T, boolean>, T = unknown>(
  value: T,
  defaultValue: X,
): X | undefined {
  if (value === undefined || value === true) {
    return defaultValue;
  } else if (value === false) {
    return undefined;
  }
  return value as X;
}

/**
 * Creates a new options handler for Monorepo projects using default values and the merger function.
 */
export const MonorepoProjectOptions = qdk.createOptions(
  'MonorepoProjectOptions',
  MonorepoProjectDefaults,
  merger,
);

/**
 * Class representing a Monorepo project.
 * Extends the base project class and configures:
 * - Package management (pnpm)
 * - A package.json
 * - and additional config files.
 */
export class MonorepoProject extends qdk.BaseProject<MonorepoProjectOptionsType> {
  constructor(
    scope: qdk.Scope | undefined,
    options: MonorepoProjectInitialOptionsType,
  ) {
    super(scope, MonorepoProjectOptions.getOptions(options, { scope }));
    // -----------------
    // Setup .gitignore
    // -----------------
    new qdk.Gitignore(this);

    // --------------------------------------
    // Setup Pnpm as the package manager with workspace support
    // --------------------------------------
    new qdk.PnpmPackageManager(this, { workspace: true });

    // --------------------------------------
    // Initialize package.json with provided or default options
    // --------------------------------------
    new qdk.PackageJson(this, this.options.packageJson);

    // --------------------------------------
    // Optionally create .npmrc file if npmrc configuration is provided
    // --------------------------------------
    if (this.options.npmrc) {
      new qdk.IniFile(
        this,
        {
          basename: '.npmrc',
        },
        this.options.npmrc,
      );
    }

    // --------------------------------------
    // Optionally create .mise.toml file if mise configuration is provided
    // --------------------------------------
    if (this.options.mise) {
      new qdk.TomlFile(
        this,
        {
          basename: '.mise.toml',
        },
        this.options.mise,
      );
    }
  }
}
