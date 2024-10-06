import debug from 'debug';

export type Logger = ReturnType<typeof createLogger>;

export type LoggerNamespace =
  | 'project'
  | 'component'
  | 'file'
  | 'filesystem'
  | 'execution'
  | 'node'
  | 'testing';

export function createLogger(ns: LoggerNamespace, tag?: string) {
  const logger = debug(`qdk:${ns}`);
  const prefix = tag ? ` ${tag}` : '';
  return {
    log(...message: unknown[]) {
      console.log(prefix, ...message);
    },

    warn(...message: unknown[]) {
      console.warn(prefix, ...message);
    },

    debug(...message: unknown[]) {
      logger(prefix, ...message);
    },
  };
}
