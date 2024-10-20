import { join } from 'node:path';
import * as qdk from 'qdk';

/**
 * Base configuration for a Node.js project.
 * This includes optional configuration for the package.json and
 * the base directory name where the project is located.
 */
interface NodeProjectOptionsBaseType {
  packageJson?: qdk.PackageJsonInitialOptions;
  basedir?: string;
}

/**
 * Full options type for Node.js projects, combining base project options and custom node-specific options.
 */
export type NodeProjectOptionsType = qdk.BaseProjectOptionsType &
  NodeProjectOptionsBaseType;

/**
 * Initial options for creating a Node.js project.
 * Partial custom options are allowed, with default fallbacks.
 */
export type NodeProjectInitialOptionsType = qdk.BaseProjectInitialOptionsType &
  Partial<NodeProjectOptionsBaseType>;

/**
 * Default options for Node.js projects.
 * The base directory is set to 'packages/' and gitignore is disabled by default.
 */
const NodeProjectDefaults = {
  basedir: 'packages/', // Default directory name for a node project
  gitignore: false, // Default: gitignore is not generated
} satisfies Partial<NodeProjectOptionsType>;

/**
 * Options merger for Node.js projects.
 * Merges initial options with defaults and calculates `outdir` based on the `basedir` and project name.
 */
const nodeProjectOptionsMerger: qdk.OptionsMerger<
  NodeProjectOptionsType,
  NodeProjectInitialOptionsType,
  typeof NodeProjectDefaults
> = (initialOptions, defaults, context) => {
  return {
    ...qdk.BaseProjectOptions.getOptions(
      {
        ...defaults,
        ...initialOptions,
        name: initialOptions.name,
        outdir:
          initialOptions.outdir ??
          join(
            initialOptions.basedir ?? defaults.basedir, // Use basedir or default 'packages/'
            getNameWithoutScope(initialOptions.name), // Calculate directory from project name
          ),
        gitignore: initialOptions.gitignore ?? defaults.gitignore,
      },
      context,
    ),
  };
};

/**
 * Creates Node.js project options by merging defaults and provided options using the custom merger.
 */
export const NodeProjectOptions = qdk.createOptions(
  'NodeProjectOptions',
  NodeProjectDefaults,
  nodeProjectOptionsMerger,
);

/**
 * Class representing a Node.js project in QDK.
 * Extends the base project class, sets up the package manager (pnpm), and configures dependencies.
 */
export class NodeProject<
  T extends NodeProjectOptionsType = NodeProjectOptionsType,
  I extends NodeProjectInitialOptionsType = NodeProjectInitialOptionsType,
> extends qdk.BaseProject<T> {
  readonly packageManager: qdk.PnpmPackageManager; // Handles package management using pnpm
  readonly packageJson: qdk.PackageJson; // Manages package.json for the project

  /**
   * Constructor to initialize the Node.js project.
   * Sets up pnpm as the package manager and configures package.json with the provided options.
   *
   * @param scope qdk.Scope - Scope for the project
   * @param options NodeProjectInitialOptionsType - Initial options passed for project setup
   */
  constructor(scope: qdk.Scope, options: I) {
    super(scope, NodeProjectOptions.getOptions(options, { scope }) as T);

    // --------------------------------------
    // Setup pnpm as the package manager
    // --------------------------------------
    this.packageManager = new qdk.PnpmPackageManager(this);

    // --------------------------------------
    // Initialize package.json with the provided options
    // --------------------------------------
    this.packageJson = new qdk.PackageJson(this, this.options.packageJson);
  }

  /**
   * Normalizes the dependency format, supporting both string and project-based dependencies.
   * If the dependency is a project, it includes a workspace notation for the version.
   *
   * @param deps Dependencies to normalize (can be strings or QDK projects)
   * @returns Normalized dependencies
   */
  protected normalizeDeps(...deps: (string | qdk.BaseProject)[]) {
    return deps.map(dep => {
      if (dep instanceof qdk.BaseProject) {
        return dep.name + '@workspace:*';
      }
      return dep;
    });
  }

  /**
   * Adds dependencies to the project by normalizing them and updating package.json.
   *
   * @param deps Dependencies to add
   * @returns This project instance (for chaining)
   */
  addDeps(...deps: (string | qdk.Project)[]) {
    this.packageJson.addDeps(...this.normalizeDeps(...deps));
    return this;
  }

  /**
   * Adds dev dependencies to the project by normalizing them and updating package.json.
   *
   * @param deps Dev dependencies to add
   * @returns This project instance (for chaining)
   */
  addDevDeps(...deps: (string | qdk.Project)[]) {
    this.packageJson.addDevDeps(...this.normalizeDeps(...deps));
    return this;
  }

  /**
   * Adds peer dependencies to the project by normalizing them and updating package.json.
   *
   * @param deps Peer dependencies to add
   * @returns This project instance (for chaining)
   */
  addPeerDeps(...deps: (string | qdk.Project)[]) {
    this.packageJson.addPeerDeps(...this.normalizeDeps(...deps));
    return this;
  }

  /**
   * Adds optional dependencies to the project by normalizing them and updating package.json.
   *
   * @param deps Optional dependencies to add
   * @returns This project instance (for chaining)
   */
  addOptionalDeps(...deps: (string | qdk.Project)[]) {
    this.packageJson.addOptionalDeps(...this.normalizeDeps(...deps));
    return this;
  }
}

/**
 * Helper function to remove the scope from a package name (if it has one).
 * If the name starts with '@', it removes the scope (everything before '/').
 */
function getNameWithoutScope(name: string) {
  return qdk.parseDependency(name).nameWithoutScope;
}
