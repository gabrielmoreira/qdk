import { PackageJsonOptions, QdkApp } from '#qdk';
import {
  printFsTree,
  QdkAppConfigFile,
  QdkAppConstructor,
  reset,
  toSnapshot,
  writeFiles,
} from '#test/helpers.mjs';
import memfs from 'memfs';
import { beforeEach, describe, expect, it, vi, vitest } from 'vitest';

vitest.mock('fs');
vitest.mock('fs/promises');
vitest.mock('#@/system/execution.mjs', () => {
  return {
    processCwd: vi.fn().mockReturnValue('/'),
    execSync: vi.fn().mockReturnValue('9.9.9-mock-latest'),
    exec: vi.fn().mockResolvedValue('9.9.9-mock-latest'),
  };
});

interface CrazyProjQdkAppConfigFile extends QdkAppConfigFile {
  default: new (...args: unknown[]) => QdkApp;
  PackageJsonOptions: typeof PackageJsonOptions;
}

const importQdkConfig = async <
  T extends CrazyProjQdkAppConfigFile = CrazyProjQdkAppConfigFile,
>() => {
  const { default: QdkAppClass, ...rest } = await vi.importActual<T>(
    './crazyproj.qdk.mts',
  );
  return { QdkAppClass, ...rest };
};

describe('qdk/crazyproj sample', () => {
  let QdkAppClass: QdkAppConstructor;
  let config: Awaited<ReturnType<typeof importQdkConfig>>;

  beforeEach(async () => {
    reset();
    config = await importQdkConfig();
    QdkAppClass = config.QdkAppClass;
  });

  it('builds a crazyproj sample project', async () => {
    // When
    await new QdkAppClass({ cwd: '/' }).synth();
    // Then
    const filesystemTree = printFsTree();
    const filesystemContent = toSnapshot();
    expect(filesystemTree).toMatchSnapshot();
    expect(filesystemContent).toMatchSnapshot();
  });

  it('builds a crazyproj sample project and delete orphan files', async t => {
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
        '/test2/build/crazyproj/.qdk/meta.json': JSON.stringify({
          files: ['.qdk/meta.json', './orphan.txt'],
        }),
        '/test2/build/crazyproj/orphan.txt': 'some file data',
      },
      memfs.fs,
    );
    // When
    expect(memfs.fs.existsSync('/test2/build/crazyproj/orphan.txt')).toBe(true);
    await new QdkAppClass({ cwd: '/test2' }).synth();
    // Then
    const filesystemTree = printFsTree();
    const filesystemContent = toSnapshot();
    expect(filesystemTree).toMatchSnapshot();
    expect(filesystemContent).toMatchSnapshot();
    expect(memfs.fs.existsSync('/test2/build/crazyproj/orphan.txt')).toBe(
      false,
    );
  });
});
