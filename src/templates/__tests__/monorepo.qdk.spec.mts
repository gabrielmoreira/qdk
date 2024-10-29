import * as execution from '#@/system/execution.mjs';
import { clearPackageVersionCache } from '#qdk';
import {
  loadToFilesystem,
  printFsTree,
  QdkAppConfigFile,
  QdkAppConstructor,
  reset,
  toSnapshot,
} from '#test/helpers.mjs';
import dedent from 'dedent';
import * as nodeFs from 'fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi, vitest } from 'vitest';
import { qdkPackageRoot } from '../../system/package.cjs';

vitest.mock('fs');
vitest.mock('fs/promises');

vitest.mock('../monorepo/.qdk/components/templates/templates.cjs', () => {
  return {
    TEMPLATES_PATH: '/qdk/src/templates/monorepo/.qdk/components/templates/',
  };
});

vitest.mock('#@/system/execution.mjs', () => {
  //const actual = await vi.importActual('../../src/system/execution.ts');
  const executionModule: typeof execution = {
    processCwd: vi.fn().mockReturnValue('/'),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    execSync: vi.fn().mockImplementation((...args) => {
      // if (args[0].startsWith('npm view')) {
      //   console.log(args[0]);
      //   return actual.execSync(...args);
      // }
      return '9.9.9-mock-latest';
    }),

    exec: vi.fn().mockImplementation((command: string) => {
      if (
        command.includes('@react-native-community/cli') &&
        command.includes(' init ')
      ) {
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
        nodeFs.mkdirSync('/apps/repo-myapp/android/app/', { recursive: true });
        nodeFs.writeFileSync('/apps/repo-myapp/app.json', '{}');
        nodeFs.writeFileSync(
          '/apps/repo-myapp/android/settings.gradle',
          settingsGradleSample,
        );
        nodeFs.writeFileSync(
          '/apps/repo-myapp/android/app/build.gradle',
          buildGradleSample,
        );

        return '';
      }
      return '9.9.9-mock-latest';
    }),
  };
  return executionModule;
});

const importQdkConfig = async () => {
  const { default: QdkAppClass } = await vi.importActual<QdkAppConfigFile>(
    '../../templates/monorepo/qdk.config.mts',
  );
  return { QdkAppClass };
};

const appTsxSample = dedent`
// ...
import React from 'react';
// ...
  <Section title="See Your Changes">
    ...
  </Section>
// ...
`;

async function getDirectoryAsJSON(
  path: string,
  changeFilename: (path: string) => string = path => path,
): Promise<Record<string, Buffer>> {
  const fs = (await vi.importActual<typeof nodeFs>('fs')).promises;
  const filesMap: Record<string, Buffer> = {};
  async function walkDirectory(currentPath: string): Promise<void> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walkDirectory(fullPath);
      } else if (entry.isFile()) {
        const content = await fs.readFile(fullPath);
        filesMap[changeFilename(fullPath)] = content;
      }
    }
  }
  await walkDirectory(path);
  return filesMap;
}

const loadTemplateFilesystem = async () => {
  const path = join(
    import.meta.dirname,
    '../monorepo/.qdk/components/templates/',
  );
  const files = await getDirectoryAsJSON(path, path => {
    return path.replace(qdkPackageRoot, '/qdk');
  });
  console.log('Loaded files', files);
  return files;
};

const loadedFiles = loadTemplateFilesystem();
const defaultFilesystem = async () => ({
  '/apps/repo-myapp/App.tsx': appTsxSample,
  ...(await loadedFiles),
});

describe('monorepo template', () => {
  let QdkAppClass: QdkAppConstructor;

  beforeEach(async () => {
    reset({
      filesystem: {
        json: await defaultFilesystem(),
      },
    });
    clearPackageVersionCache();
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
    loadToFilesystem({
      json: {
        '/apps/repo-myapp/.qdk/meta.json': JSON.stringify({
          files: ['.qdk/meta.json', './orphan.txt'],
        }),
        '/apps/repo-myapp/orphan.txt': 'some file data',
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
