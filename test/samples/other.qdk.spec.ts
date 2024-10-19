import { beforeEach, describe, expect, it, vi, vitest } from 'vitest';

import memfs from 'memfs';
import { PackageJsonOptions, QdkApp } from '../../src/index.js';
import {
  printFsTree,
  QdkAppConfigFile,
  QdkAppConstructor,
  reset,
  toSnapshot,
  writeFiles,
} from '../test-helpers.js';

vitest.mock('qdk', () => {
  return vitest.importActual('../../src/index.js');
});

const fsMock: typeof memfs = await vi.hoisted(async () => {
  return await vi.importActual('memfs');
});
vitest.mock('fs', () => {
  return fsMock;
});
vitest.mock('fs/promises', () => {
  return fsMock.fs.promises;
});

vitest.mock('../../src/system/execution.ts', () => {
  return {
    processCwd: vi.fn().mockReturnValue('/'),
    execSync: vi.fn().mockReturnValue('9.9.9-mock-latest'),
    exec: vi.fn().mockResolvedValue('9.9.9-mock-latest'),
  };
});

interface OtherQdkAppConfigFile extends QdkAppConfigFile {
  default: new (...args: unknown[]) => QdkApp;
  PackageJsonOptions: typeof PackageJsonOptions;
}

const importQdkConfig = async <
  T extends OtherQdkAppConfigFile = OtherQdkAppConfigFile,
>() => {
  const { default: QdkAppClass, ...rest } =
    await vi.importActual<T>('./other.qdk.ts');
  return { QdkAppClass, ...rest };
};

describe('qdk/monorepo sample', () => {
  let QdkAppClass: QdkAppConstructor;
  let config: Awaited<ReturnType<typeof importQdkConfig>>;

  beforeEach(async () => {
    reset();
    config = await importQdkConfig();
    QdkAppClass = config.QdkAppClass;
  });

  it('builds a monorepo sample project', async () => {
    // When
    await new QdkAppClass({ cwd: '/' }).synth();
    // Then
    const filesystemTree = printFsTree();
    const filesystemContent = toSnapshot();
    expect(filesystemTree).toMatchSnapshot();
    expect(filesystemContent).toMatchSnapshot();
  });

  it('builds a monorepo sample project and delete orphan files', async t => {
    // Given

    // ... we reset any previously loaded fileystem
    //resetFilesystem({}, vol);
    // ... we change the package json defaults
    PackageJsonOptions.replaceDefaults({
      version: '9.9.9-' + t.task.name.replace(/[^a-zA-Z0-9]/g, ''),
    });
    // ... we have some preexistent files
    await writeFiles(
      {
        '/test2/build/monorepo/.qdk/meta.json': JSON.stringify({
          files: ['.qdk/meta.json', './orphan.txt'],
        }),
        '/test2/build/monorepo/orphan.txt': 'some file data',
      },
      memfs.fs,
    );
    // When
    expect(memfs.fs.existsSync('/test2/build/monorepo/orphan.txt')).toBe(true);
    await new QdkAppClass({ cwd: '/test2' }).synth();
    // Then
    const filesystemTree = printFsTree();
    const filesystemContent = toSnapshot();
    expect(filesystemTree).toMatchSnapshot();
    expect(filesystemContent).toMatchSnapshot();
    expect(memfs.fs.existsSync('/test2/build/monorepo/orphan.txt')).toBe(false);
  });
});
