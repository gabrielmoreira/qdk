import { DirectoryJSON, fs, vol } from 'memfs';
import fsPrint from 'memfs/lib/print';
import { dirname, join } from 'node:path';
import { createLogger } from '../src/system/logger.js';

const logger = createLogger('testing', 'test-helpers');

export const rootPath = '/';

export function resetFs(json?: DirectoryJSON, cwd?: string) {
  logger.debug('resetFs');
  vol.reset();
  vol.fromJSON(json ?? {}, cwd ?? rootPath);
}

export function printFsTree(dir: string = rootPath) {
  return fsPrint.toTreeSync(fs, { dir });
}

export async function readStringFile(path: string, cwd: string = rootPath) {
  logger.debug('readStringFile(', path, cwd, ')');
  const file = await fs.promises.readFile(cwd ? join(cwd, path) : path);
  return file.toString();
}

export async function writeStringFile(
  pathOrOptions: string | { path: string; cwd?: string },
  data: string | Buffer,
) {
  const isOptions = typeof pathOrOptions !== 'string';
  const path = isOptions ? pathOrOptions.path : pathOrOptions;
  const cwd =
    !isOptions || pathOrOptions.cwd === undefined ? rootPath : undefined;
  const filename = cwd ? join(cwd, path) : path;
  logger.debug(
    'writeStringFile(',
    filename,
    ', filedata). File data:\n===BEGIN===\n',
    data,
    '\n===EOF===\n',
  );
  await fs.promises.writeFile(filename, data);
}

export async function writeFiles(files: Record<string, string | Buffer>) {
  await Promise.all(
    Object.entries(files).map(async ([name, content]) => {
      await fs.promises.mkdir(dirname(name), { recursive: true });
      await writeStringFile(name, content);
    }),
  );
}

export function toSnapshot(path?: string) {
  return vol.toJSON(path);
}
