import { afterEach, describe, expect, it, vi, vitest } from 'vitest';
import { PackageJsonOptions } from '../../src/index.js';
import {
  printFsTree,
  reset,
  SampleApp,
  toSnapshot,
  writeFiles,
} from '../test-helpers.js';

const synthMonorepo = async () => {
  const { default: MyApp } =
    await vi.importActual<SampleApp>('./monorepo.qdk.js');
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
  afterEach(() => {
    reset();
    PackageJsonOptions.restoreDefaults();
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

  it('builds a monorepo sample project and delete orphan files', async s => {
    PackageJsonOptions.replaceDefaults({
      version: '0.2.0-' + s.task.name.replace(/[^a-zA-Z0-9]/g, ''),
    });
    // Given some preexistent files
    await writeFiles({
      '/build/monorepo/.qdk/meta.json': JSON.stringify({
        files: ['.qdk/meta.json', './orphan.txt'],
      }),
      '/build/monorepo/orphan.txt': 'some file data',
    });
    // When
    await synthMonorepo();
    // Then
    const filesystemTree = printFsTree();
    const filesystemContent = toSnapshot();
    expect(filesystemTree).toMatchSnapshot();
    expect(filesystemContent).toMatchSnapshot();
  });
});
