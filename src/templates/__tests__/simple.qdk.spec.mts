import {
  printFsTree,
  QdkAppConfigFile,
  QdkAppConstructor,
  reset,
  resetFilesystem,
  toSnapshot,
} from '#test/helpers.mjs';
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  vitest,
} from 'vitest';

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2024-10-06T20:57:10.606Z'));
});

vitest.mock('fs');
vitest.mock('fs/promises');

vitest.mock('#@/system/execution.mjs', () => {
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

const importQdkConfig = async () => {
  const { default: QdkAppClass } = await vi.importActual<QdkAppConfigFile>(
    '../../templates/simple/qdk.config.mts',
  );
  return { QdkAppClass };
};

describe('simple template', () => {
  let QdkAppClass: QdkAppConstructor;

  beforeEach(async () => {
    reset();
    QdkAppClass = (await importQdkConfig()).QdkAppClass;
  });

  it('synthetize a simple template', async () => {
    // When
    await new QdkAppClass({ cwd: '/' }).synth();

    // Then
    const filesystemTree = printFsTree();
    const filesystemContent = toSnapshot();
    expect(filesystemTree).toMatchSnapshot();
    expect(filesystemContent).toMatchSnapshot();
  });

  it('synthetize a simple template and delete orphan files', async () => {
    // Given some preexistent files
    resetFilesystem({
      json: {
        '/.qdk/meta.json': JSON.stringify({
          files: ['.qdk/meta.json', './orphan.txt'],
        }),
        '/orphan.txt': 'some file data',
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
