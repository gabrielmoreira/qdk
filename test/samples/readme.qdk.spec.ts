import { afterEach, beforeAll, describe, expect, it, vi, vitest } from 'vitest';
import * as templates from '../../src/templates/init.template.js';
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  const fs = (await vi.importActual('node:fs')) as any;
  const content = templates
    .simple()
    .replace(`} from 'qdk';`, `} from '../../src/index.js';`);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  fs.writeFileSync(import.meta.dirname + '/readme.qdk.ts', content);
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
  //const actual = await vi.importActual('../../src/system/execution.ts');
  return {
    processCwd: vi.fn().mockReturnValue('/'),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    execSync: vi.fn().mockImplementation((...args) => {
      // if (args[0].startsWith('npm view')) {
      //   console.log(args[0]);
      //   return actual.execSync(...args);
      // }
      return '9.9.9-mock-latest';
    }),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    exec: vi.fn().mockImplementation(_data => {
      return '9.9.9-mock-latest';
    }),
  };
});

afterEach(() => {
  reset();
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
