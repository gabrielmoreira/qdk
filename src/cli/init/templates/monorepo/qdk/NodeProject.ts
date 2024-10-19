import { join } from 'node:path';
import * as qdk from 'qdk';

interface NodeProjectOptionsBaseType {
  packageJson?: qdk.PackageJsonInitialOptions;
  basedir?: string;
}
export type NodeProjectOptionsType = qdk.BaseProjectOptionsType &
  NodeProjectOptionsBaseType;
export type NodeProjectInitialOptionsType = qdk.BaseProjectInitialOptionsType &
  Partial<NodeProjectOptionsBaseType>;
const NodeProjectDefaults = {
  basedir: 'packages/',
  gitignore: false,
} satisfies Partial<NodeProjectOptionsType>;

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
            initialOptions.basedir ?? defaults.basedir,
            getNameWithoutScope(initialOptions.name),
          ),
        gitignore: initialOptions.gitignore ?? defaults.gitignore,
      },
      context,
    ),
  };
};

export const NodeProjectOptions = qdk.createOptions(
  'NodeProjectOptions',
  NodeProjectDefaults,
  nodeProjectOptionsMerger,
);

export class NodeProject<
  T extends NodeProjectOptionsType = NodeProjectOptionsType,
  I extends NodeProjectInitialOptionsType = NodeProjectInitialOptionsType,
> extends qdk.BaseProject<T> {
  readonly packageManager: qdk.PnpmPackageManager;
  readonly packageJson: qdk.PackageJson;

  protected normalizeDeps(...deps: (string | qdk.BaseProject)[]) {
    return deps.map(dep => {
      if (dep instanceof qdk.BaseProject) {
        return dep.name + '@workspace:*';
      }
      return dep;
    });
  }
  addDeps(...deps: (string | qdk.Project)[]) {
    this.packageJson.addDeps(...this.normalizeDeps(...deps));
    return this;
  }
  addDevDeps(...deps: (string | qdk.Project)[]) {
    this.packageJson.addDevDeps(...this.normalizeDeps(...deps));
    return this;
  }
  addPeerDeps(...deps: (string | qdk.Project)[]) {
    this.packageJson.addPeerDeps(...this.normalizeDeps(...deps));
    return this;
  }
  addOptionalDeps(...deps: (string | qdk.Project)[]) {
    this.packageJson.addOptionalDeps(...this.normalizeDeps(...deps));
    return this;
  }
  constructor(scope: qdk.Scope, options: I) {
    super(scope, NodeProjectOptions.getOptions(options, { scope }) as T);
    this.packageManager = new qdk.PnpmPackageManager(this);
    this.packageJson = new qdk.PackageJson(this, this.options.packageJson);
  }
}

function getNameWithoutScope(name: string) {
  if (name.startsWith('@')) {
    return name.split('/').pop()!;
  }
  return name;
}
