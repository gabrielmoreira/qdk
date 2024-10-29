export function getErrorCode(e: unknown): string | number | undefined {
  if (typeof e === 'object' && e) {
    if ('code' in e) return e.code as string | number | undefined;
    if (e instanceof Error) return e.name;
  }
}
