import { Logger } from '#@/system/logger.mjs';

export function traceIt<T extends (...args: Parameters<T>) => ReturnType<T>>(
  name: string,
  fn: T,
  logger: Logger,
): T {
  return ((...args) => {
    logger.debug(`${name}(${JSON.stringify(args)})`);

    return fn(...args);
  }) as T;
}
