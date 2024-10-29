const regex = /^(?:(?<scope>@[^/]+)\/)?(?<name>[^@]+)(?:@(?<version>.+))?$/;

export function parseDependency(spec: string): DependencyName {
  const results = regex.exec(spec?.trim());
  if (!results?.groups) throw new Error('Invalid name: [' + spec + ']');
  const { scope, name, version } = results.groups;
  return {
    scope,
    name: scope ? scope + '/' + name : name,
    nameWithoutScope: name,
    version,
  };
}

export interface PackageName {
  /**
   * For "@repo/package-name" it returns "@repo/package-name"
   * For "@repo/package-name@^1.0.0" it returns "@repo/package-name"
   * For "package-name" it returns "package-name"
   * For "package-name@^1.0.0" it returns "package-name"
   */
  name: string;

  /**
   * For "@repo/package-name" it returns "package-name"
   * For "@repo/package-name@^1.0.0" it returns "package-name"
   * For "package-name" it returns "package-name"
   * For "package-name@^1.0.0" it returns "package-name"
   */
  nameWithoutScope: string;

  /**
   * For "@repo/package-name" it returns "@repo"
   * For "@repo/package-name@^1.0.0" it returns "@repo"
   * For "package-name" it returns undefined
   * For "package-name@^1.0.0" it returns undefined
   */
  scope?: string;
}

export type DependencyName = PackageName & {
  /**
   * For "@repo/package-name" it returns undefined
   * For "@repo/package-name@^1.0.0" it returns "^1.0.0"
   * For "package-name" it returns undefined
   * For "package-name@^1.0.0" it returns "^1.0.0"
   */
  version?: string;
};
