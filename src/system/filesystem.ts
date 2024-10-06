import {
  existsSync as fsExistsSync,
  readFileSync as fsReadFileSync,
  type Stats,
} from 'node:fs';
import {
  mkdir as fsMkdir,
  readFile as fsReadFile,
  unlink as fsUnlink,
  writeFile as fsWriteFile,
} from 'node:fs/promises';
import Vinyl from 'vinyl';
import { createLogger } from './logger.js';

const logger = createLogger('filesystem');

interface ConstructorOptions {
  /**
   * The current working directory of the file. Default: process.cwd()
   */
  cwd?: string | undefined;

  /**
   * Used for relative pathing. Typically where a glob starts. Default: options.cwd
   */
  base?: string | undefined;

  /**
   * Full path to the file.
   */
  path?: string | undefined;

  /**
   * Stores the path history. If `options.path` and `options.history` are both passed,
   * `options.path` is appended to `options.history`. All `options.history` paths are
   * normalized by the `file.path` setter.
   * Default: `[]` (or `[options.path]` if `options.path` is passed)
   */
  history?: string[] | undefined;

  /**
   * The result of an fs.stat call. This is how you mark the file as a directory or
   * symbolic link. See `isDirectory()`, `isSymbolic()` and `fs.Stats` for more information.
   * https://nodejs.org/api/fs.html#fs_class_fs_stats
   */
  stat?: Stats | undefined;

  /**
   * File contents.
   * Type: `Buffer`, `Stream`, or null
   * Default: null
   */
  contents?: Buffer | NodeJS.ReadableStream | null | undefined;

  /**
   * Any custom option properties will be directly assigned to the new Vinyl object.
   */
  [customOption: string]: unknown;
}

export const createFile = (opts: ConstructorOptions) => new Vinyl(opts);

function traceIt<T extends (...args: Parameters<T>) => ReturnType<T>>(
  name: string,
  fn: T,
): T {
  return ((...args) => {
    logger.debug(`${name}(${JSON.stringify(args)})`);

    return fn(...args);
  }) as T;
}

export type FsFile = ReturnType<typeof createFile>;
export const mkdir = traceIt('fs.promises.mkdir', fsMkdir);
export const readFile = traceIt('fs.promises.readFile', fsReadFile);
export const writeFile = traceIt('fs.promises.writeFile', fsWriteFile);
export const existsSync = traceIt('fs.existsSync', fsExistsSync);
export const readFileSync = traceIt('fs.readFileSync', fsReadFileSync);
export const unlink = traceIt('fs.promises.unlink', fsUnlink);
