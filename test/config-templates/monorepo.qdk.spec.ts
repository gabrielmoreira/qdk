import dedent from 'dedent';
import memfs from 'memfs';
import { beforeEach, describe, expect, it, vi, vitest } from 'vitest';
import {
  printFsTree,
  QdkAppConfigFile,
  QdkAppConstructor,
  reset,
  resetFilesystem,
  toSnapshot,
} from '../test-helpers.js';

vitest.mock('qdk', () => {
  return vitest.importActual('../../src/index.js');
});

const fsMock: typeof memfs = await vi.hoisted(async () => {
  return await vi.importActual('memfs');
});
vitest.mock('fs', () => {
  return fsMock;
});
vitest.mock('fs/promises', () => {
  return fsMock.fs.promises;
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

const importQdkConfig = async () => {
  const { default: QdkAppClass } = await vi.importActual<QdkAppConfigFile>(
    '../../src/cli/init/templates/monorepo/qdk.config.ts',
  );
  return { QdkAppClass };
};

const buildGradleSample = dedent`
  react {
      /* Folders */
      //   The root of your project, i.e. where "package.json" lives. Default is '../..'
      // root = file("../../")
      //   The folder where the react-native NPM package is. Default is ../../node_modules/react-native
      // reactNativeDir = file("../../node_modules/react-native")
      //   The folder where the react-native Codegen package is. Default is ../../node_modules/@react-native/codegen
      // codegenDir = file("../../node_modules/@react-native/codegen")
      //   The cli.js file which is the React Native CLI entrypoint. Default is ../../node_modules/react-native/cli.js
      // cliFile = file("../../node_modules/react-native/cli.js")
  }
`;

const settingsGradleSample = dedent`
  pluginManagement { includeBuild("../node_modules/@react-native/gradle-plugin") }
  plugins { id("com.facebook.react.settings") }
  extensions.configure(com.facebook.react.ReactSettingsExtension){ ex -> ex.autolinkLibrariesFromCommand() }
  rootProject.name = 'com.example.app'
  include ':app'
  includeBuild('../node_modules/@react-native/gradle-plugin')
`;

const defaultFilesystem = {
  '/apps/my-app/android/settings.gradle': settingsGradleSample,
  '/apps/my-app/android/app/build.gradle': buildGradleSample,
  '/apps/some-other-app/android/settings.gradle': settingsGradleSample,
  '/apps/some-other-app/android/app/build.gradle': buildGradleSample,
};

describe('monorepo template', () => {
  let QdkAppClass: QdkAppConstructor;

  beforeEach(async () => {
    reset({
      filesystem: {
        json: defaultFilesystem,
      },
    });
    QdkAppClass = (await importQdkConfig()).QdkAppClass;
  });

  it('synthetize a monorepo template', async () => {
    // When
    await new QdkAppClass({ cwd: '/' }).synth();

    // Then
    const filesystemTree = printFsTree();
    const filesystemContent = toSnapshot();
    expect(filesystemTree).toMatchSnapshot();
    expect(filesystemContent).toMatchSnapshot();
  });

  it('synthetize a monorepo template and delete orphan files', async () => {
    // Given some preexistent files
    resetFilesystem({
      json: {
        ...defaultFilesystem,
        '/apps/my-app/.qdk/meta.json': JSON.stringify({
          files: ['.qdk/meta.json', './orphan.txt'],
        }),
        '/apps/my-app/orphan.txt': 'some file data',
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
