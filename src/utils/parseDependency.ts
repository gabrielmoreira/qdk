export function parseDependency(spec: string) {
  const scope = spec.startsWith('@');
  if (scope) {
    spec = spec.substring(1);
  }
  const [module, ...version] = spec.split('@');
  const name = scope ? `@${module}` : module;
  if (version.length == 0) {
    return { name };
  } else {
    return { name, version: version?.join('@') };
  }
}
