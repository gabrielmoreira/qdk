export function assertRequired<T>(
  instance: T | undefined | null,
  message: string,
): T {
  if (instance === null || instance === undefined) {
    throw new Error(message);
  }
  return instance;
}
