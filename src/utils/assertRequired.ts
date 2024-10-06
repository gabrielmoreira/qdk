export function assertRequired<T>(
  instance?: T | null,
  message = 'Instance is required',
): T {
  if (instance === null || typeof instance === 'undefined') {
    throw new Error(message);
  }
  return instance;
}
