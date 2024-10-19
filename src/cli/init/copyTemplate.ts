import { globby } from 'globby';
import { existsSync } from 'node:fs';
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { metaDirname } from './dirname.cjs';

export async function copyTemplate(
  template: string,
  { cwd: destdir, forceOverwrite }: { cwd: string; forceOverwrite: boolean },
) {
  const srcdir = join(metaDirname, 'templates', template);
  //console.log('srcdir', srcdir);
  const paths = await globby(`**/*`, { cwd: srcdir, dot: true });
  //console.log('paths', srcdir);
  const directories = [
    ...new Set(paths.map(path => join(destdir, dirname(path)))),
  ];
  //console.log('directories', directories);
  await Promise.all(directories.map(dir => mkdir(dir, { recursive: true })));
  const copyList = paths.map(path => [join(srcdir, path), join(destdir, path)]);
  //console.log('copy list', copyList);
  const generated: string[] = [];
  await Promise.all(
    copyList.map(async ([srcpath, destpath]) => {
      /*console.log(
        'Copy',
        srcpath,
        'to',
        destpath,
        'exists:',
        existsSync(destpath),
        'forceOverwrite',
        forceOverwrite,
      );
      */
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
