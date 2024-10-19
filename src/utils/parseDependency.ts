export function parseDependency(spec: string): DependencyName {
  const scope = spec.startsWith('@');
  if (scope) {
    spec = spec.substring(1);
  }
  const [module, ...version] = spec.split('@');
  const name = scope ? `@${module}` : module;
  const versionObj =
    version.length === 0
      ? {}
      : {
          version: version?.join('@'),
        };
  const scopeObj = scope ? { scope: '@' + module } : {};
  return {
    ...scopeObj,
    name,
    nameWithoutScope: name.split('/')[1],
    ...versionObj,
  };
}

export interface PackageName {
  name: string;
  nameWithoutScope: string;
}

export interface ScopedPackageName extends PackageName {
  scope: string;
}

export type DependencyName = (PackageName | ScopedPackageName) & {
  version?: string;
};
