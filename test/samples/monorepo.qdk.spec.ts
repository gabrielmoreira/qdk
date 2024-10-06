import { afterEach, describe, expect, it, vi, vitest } from 'vitest';
import {
  printFsTree,
  resetFs,
  toSnapshot,
  writeFiles,
} from '../test-helpers.js';
import { synthMonorepo } from './monorepo.qdk.js';

vitest.mock('fs', async () => {
  return await vi.importActual('memfs');
});

vitest.mock('fs/promises', async () => {
  return (await vi.importActual('memfs')).promises;
});

vitest.mock('../../src/system/execution.ts', () => {
  return {
    processCwd: vi.fn().mockReturnValue('/'),
    execSync: vi.fn().mockReturnValue('1.0.0-mock'),
    exec: vi.fn().mockResolvedValue('1.0.0-mock'),
  };
});

describe('qdk/monorepo sample', () => {
  afterEach(() => resetFs());
  it('builds a monorepo sample project', async () => {
    // When
    await synthMonorepo();
    // Then
    const filesystemTree = printFsTree();
    const filesystemContent = toSnapshot();
    expect(filesystemTree).toMatchSnapshot();
    expect(filesystemContent).toMatchSnapshot();
  });

  it('builds a monorepo sample project and delete orphan files', async () => {
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
