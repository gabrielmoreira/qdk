import { afterEach, beforeAll, describe, expect, it, vi, vitest } from 'vitest';
import { DefaultOptions } from '../../src/index.js';
import {
  printFsTree,
  reset,
  SampleApp,
  toSnapshot,
  writeFiles,
} from '../test-helpers.js';

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2024-10-06T20:57:10.606Z'));
});

const synthReadmeSample = async () => {
  const { default: MyApp } =
    await vi.importActual<SampleApp>('./readme.qdk.js');
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
    execSync: vi.fn().mockReturnValue('1.0.0-mock'),
    exec: vi.fn().mockResolvedValue('1.0.0-mock'),
  };
});
const defaultOptions = DefaultOptions.toSnapshot();
afterEach(() => {
  reset({
    defaultOptions,
  });
});

describe('qdk/readme sample', () => {
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
