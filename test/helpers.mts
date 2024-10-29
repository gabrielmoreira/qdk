import { createLogger } from '#@/system/logger.mjs';
import { QdkApp } from '#qdk';
import memfs from 'memfs';
import fsPrint from 'memfs/lib/print';
import { dirname, join } from 'node:path';
import { vi } from 'vitest';

const logger = createLogger('testing', 'test-helpers');

export const rootPath = '/';

export function resetFilesystem(
  opts: { json?: memfs.DirectoryJSON; cwd?: string },
  vol = memfs.vol,
) {
  logger.debug('resetFilesystem');
  console.log(opts.json);
  vol.reset();
  vol.fromJSON(opts?.json ?? {}, opts?.cwd ?? rootPath);
}

export function loadToFilesystem(
  opts: { json?: memfs.DirectoryJSON; cwd?: string },
  vol = memfs.vol,
) {
  vol.fromJSON(opts?.json ?? {}, opts?.cwd ?? rootPath);
}

export function printFsTree(dir: string = rootPath, volume = memfs.vol) {
  return fsPrint.toTreeSync(volume, { dir });
}

export async function readStringFile(
  path: string,
  cwd: string = rootPath,
  volume = memfs.vol,
) {
  logger.debug('readStringFile(', path, cwd, ')');
  const file = await volume.promises.readFile(cwd ? join(cwd, path) : path);
  return file.toString();
}

export async function writeStringFile(
  pathOrOptions: string | { path: string; cwd?: string },
  data: string | Buffer,
  volume = memfs.vol,
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
  volume = memfs.vol,
) {
  await Promise.all(
    Object.entries(files).map(async ([name, content]) => {
      await volume.promises.mkdir(dirname(name), { recursive: true });
      await writeStringFile(name, content);
    }),
  );
}

export function toSnapshot(path?: string, volume = memfs.vol) {
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

export interface QdkAppConfigFile {
  default: QdkAppConstructor;
}

export type QdkAppConstructor = new ({ cwd }: { cwd: string }) => QdkApp;
