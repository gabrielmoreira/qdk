import { beforeEach, describe, expect, it, vi, vitest } from 'vitest';

import { Volume } from 'memfs/lib/volume.js';
import type { PackageJsonOptions, QdkApp } from '../../src/index.js';
import {
  printFsTree,
  reset,
  resetFilesystem,
  toSnapshot,
  writeFiles,
} from '../test-helpers.js';

interface QdkConfig {
  default: new (...args: unknown[]) => QdkApp;
  PackageJsonOptions: typeof PackageJsonOptions;
  vol: Volume;
}

const loadQdkConfig = async () => {
  return await vi.importActual<QdkConfig>('./monorepo.qdk.js');
};

const synthMonorepo = async () => {
  const { default: MyApp } = await loadQdkConfig();
  return new MyApp({ cwd: '/' }).synth();
};

vitest.mock('fs', async () => {
  return await vi.importActual('memfs');
});

vitest.mock('fs/promises', async () => {
  return (await vi.importActual('memfs')).promises;
});

vitest.mock('../../src/system/execution.ts', () => {
  return {
    processCwd: vi.fn().mockReturnValue('/'),
    execSync: vi.fn().mockReturnValue('9.9.9-mock-latest'),
    exec: vi.fn().mockResolvedValue('9.9.9-mock-latest'),
  };
});

describe('qdk/monorepo sample', () => {
  beforeEach(() => {
    reset();
  });
  it('builds a monorepo sample project', async () => {
    // When
    await synthMonorepo();
    // Then
    const filesystemTree = printFsTree();
    const filesystemContent = toSnapshot();
    expect(filesystemTree).toMatchSnapshot();
    expect(filesystemContent).toMatchSnapshot();
  });

  it('builds a monorepo sample project and delete orphan files', async t => {
    // Given
    const { PackageJsonOptions, default: MyApp, vol } = await loadQdkConfig();
    // ... we reset any previously loaded fileystem
    resetFilesystem({}, vol);
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
      vol,
    );
    // When
    expect(vol.existsSync('/test2/build/monorepo/orphan.txt')).toBe(true);
    await new MyApp({ cwd: '/test2' }).synth();
    // Then
    const filesystemTree = printFsTree();
    const filesystemContent = toSnapshot(undefined, vol);
    expect(filesystemTree).toMatchSnapshot();
    expect(filesystemContent).toMatchSnapshot();
    expect(vol.existsSync('/test2/build/monorepo/orphan.txt')).toBe(false);
  });
});
