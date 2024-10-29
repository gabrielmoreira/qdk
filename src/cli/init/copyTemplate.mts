import { relativeToCwd } from '#qdk';
import Debug from 'debug';
import { globby } from 'globby';
import fs, { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
const debug = Debug('qdk:template');

export async function copyTemplate(
  template: string,
  { cwd: destdir, forceOverwrite }: { cwd: string; forceOverwrite: boolean },
) {
  const srcdir = join(import.meta.dirname, '..', '..', 'templates', template);
  debug('srcdir', srcdir);
  const paths = await globby(`**/*`, { cwd: srcdir, dot: true, fs });
  debug('paths', srcdir);
  const directories = [
    ...new Set(paths.map(path => join(destdir, dirname(path)))),
  ];
  debug('directories', directories);
  await Promise.all(directories.map(dir => mkdir(dir, { recursive: true })));
  const copyList = paths.map(path => [join(srcdir, path), join(destdir, path)]);
  debug('copy list', copyList);
  const generated: string[] = [];
  await Promise.all(
    copyList.map(async ([srcpath, destpath]) => {
      debug('Copy from', srcpath, 'to', destpath);
      if (!existsSync(destpath) || forceOverwrite) {
        await copyFile(srcpath, destpath);
        generated.push(relative(destdir, destpath));
      } else {
        console.warn(
          'File',
          relative(destdir, destpath),
          'already exists. Use -f to overwrite it.',
        );
      }
    }),
  );
  return generated;
}

async function copyFile(from: string, to: string) {
  const input = await readFile(from);
  const output = normalizeContent(from, input);
  await mkdir(dirname(to), { recursive: true });
  await writeFile(to, output);
}

const normalizePaths = /(\.js|\.ts|\.cjs|\.mjs|\.mts|\.cts|\.jsx|\.tsx)$/;

function normalizeContent(path: string, content: Buffer) {
  if (!normalizePaths.test(path)) {
    debug('Path ', relativeToCwd(path), 'should not be normalized. Skipping.');
    return content;
  }
  debug('Path ', relativeToCwd(path), 'should be normalized. Processing...');
  return content
    .toString()
    .replaceAll(`'#qdk'`, `'qdk'`)
    .replaceAll(`"#qdk"`, `"qdk"`);
}
