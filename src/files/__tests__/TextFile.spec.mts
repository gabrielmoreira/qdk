import {
  readStringFile,
  reset,
  writeFiles,
  writeStringFile,
} from '#test/helpers.mjs';
import { afterEach, describe, expect, it, vi, vitest } from 'vitest';
import { Project, TextFile } from '../../index.mjs';

vitest.mock('fs', async () => {
  return await vi.importActual('memfs');
});

vitest.mock('fs/promises', async () => {
  return (await vi.importActual('memfs')).promises;
});

vitest.mock('#@/system/execution.mjs', () => {
  return {
    processCwd: vi.fn().mockReturnValue('/'),
    execSync: vi.fn().mockReturnValue('1.0.0-mock'),
    exec: vi.fn().mockResolvedValue('1.0.0-mock'),
  };
});

describe('TextFile', () => {
  afterEach(() => reset());

  it('writes to filesystem', async () => {
    // Given
    const project = new Project(null, {
      name: 'testing',
    });
    const textData = 'some data';
    const text = new TextFile(
      project,
      {
        basename: 'test.txt',
      },
      textData,
    );
    // When
    await text.write();
    // Then
    expect(await readStringFile('test.txt')).toBe(textData);
  });
  it('reads from filesystem during initialization', async () => {
    // Given
    const storedData = 'initial data';
    await writeFiles({ 'test2.txt': storedData });
    const project = new Project(null, {
      name: 'testing',
    });
    // When
    const text = new TextFile(
      project,
      {
        basename: 'test2.txt',
      },
      'some data',
    );
    // Then
    expect(text.loadedData).toBe(storedData);
  });
  it('can disable reading from filesystem during initialization', async () => {
    // Given
    const storedData = 'initial data';
    await writeStringFile('test2.txt', storedData);
    const project = new Project(null, {
      name: 'testing',
    });
    // When
    const text = new TextFile(
      project,
      {
        basename: 'test2.txt',
        readOnInit: false,
      },
      'some data',
    );
    // Then
    expect(text.loadedData).toBeUndefined();
  });
});
