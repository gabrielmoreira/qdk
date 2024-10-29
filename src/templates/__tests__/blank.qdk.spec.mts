import {
  printFsTree,
  QdkAppConfigFile,
  QdkAppConstructor,
  reset,
  resetFilesystem,
  toSnapshot,
} from '#test/helpers.mjs';
import { beforeEach, describe, expect, it, vi, vitest } from 'vitest';

vitest.mock('fs');
vitest.mock('fs/promises');

vitest.mock('#@/system/execution.mjs', () => {
  //const actual = await vi.importActual('../../system/execution.mjs');
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

const importQdkConfig = async () => {
  const { default: QdkAppClass } = await vi.importActual<QdkAppConfigFile>(
    '../../templates/blank/qdk.config.mts',
  );
  return { QdkAppClass };
};

describe('blank template', () => {
  let QdkAppClass: QdkAppConstructor;

  beforeEach(async () => {
    reset();
    QdkAppClass = (await importQdkConfig()).QdkAppClass;
  });

  it('synthetize a blank template', async () => {
    // When
    await new QdkAppClass({ cwd: '/' }).synth();

    // Then
    const filesystemTree = printFsTree();
    const filesystemContent = toSnapshot();
    expect(filesystemTree).toMatchSnapshot();
    expect(filesystemContent).toMatchSnapshot();
  });

  it('synthetize a blank template and delete orphan files', async () => {
    // Given some preexistent files
    resetFilesystem({
      json: {
        '/build/readme/.qdk/meta.json': JSON.stringify({
          files: ['.qdk/meta.json', './orphan.txt'],
        }),
        '/build/readme/orphan.txt': 'some file data',
      },
    });

    // When
    await new QdkAppClass({ cwd: '/' }).synth();
    // Then
    const filesystemTree = printFsTree();
    const filesystemContent = toSnapshot();
    expect(filesystemTree).toMatchSnapshot();
    expect(filesystemContent).toMatchSnapshot();
  });
});
