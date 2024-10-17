import { DirectoryJSON, vol } from 'memfs';
import fsPrint from 'memfs/lib/print';
import { Volume } from 'memfs/lib/volume.js';
import { dirname, join } from 'node:path';
import { vi } from 'vitest';
import { QdkApp } from '../src/index.js';
import { createLogger } from '../src/system/logger.js';

const logger = createLogger('testing', 'test-helpers');

export const rootPath = '/';

export function resetFilesystem(
  opts: { json?: DirectoryJSON; cwd?: string },
  volume: Volume = vol,
) {
  logger.debug('resetFilesystem');
  volume.reset();
  volume.fromJSON(opts?.json ?? {}, opts?.cwd ?? rootPath);
}

export function printFsTree(dir: string = rootPath, volume: Volume = vol) {
  return fsPrint.toTreeSync(volume, { dir });
}

export async function readStringFile(
  path: string,
  cwd: string = rootPath,
  volume: Volume = vol,
) {
  logger.debug('readStringFile(', path, cwd, ')');
  const file = await volume.promises.readFile(cwd ? join(cwd, path) : path);
  return file.toString();
}

export async function writeStringFile(
  pathOrOptions: string | { path: string; cwd?: string },
  data: string | Buffer,
  volume: Volume = vol,
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
  await volume.promises.writeFile(filename, data);
}

export async function writeFiles(
  files: Record<string, string | Buffer>,
  volume: Volume = vol,
) {
  await Promise.all(
    Object.entries(files).map(async ([name, content]) => {
      await volume.promises.mkdir(dirname(name), { recursive: true });
      await writeStringFile(name, content);
    }),
  );
}

export function toSnapshot(path?: string, volume: Volume = vol) {
  return volume.toJSON(path);
}

export function reset({
  filesystem,
  timers,
  mocks,
  modules,
}: {
  filesystem?: boolean | Parameters<typeof resetFilesystem>[0];
  timers?: boolean;
  mocks?: boolean;
  modules?: boolean;
} = {}) {
  if (timers) vi.useRealTimers();
  if (modules) vi.resetModules();
  if (mocks) vi.resetAllMocks();
  if (filesystem)
    resetFilesystem(typeof filesystem === 'boolean' ? {} : filesystem);
}

export interface SampleApp {
  default: new ({ cwd }: { cwd: string }) => QdkApp;
}
