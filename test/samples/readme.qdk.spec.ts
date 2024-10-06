import { afterEach, describe, expect, it, vi, vitest } from 'vitest';
import {
  printFsTree,
  resetFs,
  toSnapshot,
  writeFiles,
} from '../test-helpers.js';
import { synthReadmeSample } from './readme.qdk.js';

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

describe('qdk/readme sample', () => {
  afterEach(() => resetFs());
  it('builds a readme sample project', async () => {
    // When
    await synthReadmeSample();
    // Then
    const filesystemTree = printFsTree();
    const filesystemContent = toSnapshot();
    expect(filesystemTree).toMatchSnapshot();
    expect(filesystemContent).toMatchSnapshot();
  });

  it('builds a readme sample project and delete orphan files', async () => {
    // Given some preexistent files
    await writeFiles({
      '/build/readme/.qdk/meta.json': JSON.stringify({
        files: ['.qdk/meta.json', './orphan.txt'],
      }),
      '/build/readme/orphan.txt': 'some file data',
    });
    // When
    await synthReadmeSample();
    // Then
    const filesystemTree = printFsTree();
    const filesystemContent = toSnapshot();
    expect(filesystemTree).toMatchSnapshot();
    expect(filesystemContent).toMatchSnapshot();
  });
});
