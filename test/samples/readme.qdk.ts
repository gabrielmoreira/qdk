import {
  EsLint,
  NpmPackageManager,
  PackageJson,
  SampleFiles,
  SimpleProject,
  TsConfigBases,
  Typescript,
} from '../../src/index.js';
// } from 'qdk';

const isTest = process.env.NODE_ENV === 'test';
const rootPath = isTest ? undefined : import.meta.dirname;
// const rootPath = isTest ? undefined : __dirname;

export async function synthReadmeSample() {
  /*
   * Run the following commands:
   * ```sh
   *   npm init -y; npm pkg set type="module" scripts.qdk="tsx qdk.config.ts"; npm install --save-dev qdk tsx
   *   npx tsx qdk.config.ts
   * ```
   * After that you can run:
   * ```sh
   * npm run qdk
   * ```
   */

  // Create a new empty project
  const root = new SimpleProject(null, {
    name: 'qdk-sample',
    outdir: '.',
    cwd: rootPath,
  });

  // Use npm package manager (set this project as the workspace root)
  new NpmPackageManager(root, { workspace: true });

  // Customize package.json and add custom dependencies
  new PackageJson(root)
    .addDevDeps('qdk', 'tsx', 'vitest')
    .setScript('qdk', 'tsx qdk.config.ts')
    .setScript('test', 'vitest')
    .update(pkg => {
      pkg.type = 'module';
    });

  // Typescript TSConfig
  new Typescript(root, {
    tsconfig: {
      extends: [TsConfigBases.Node20],
      config: {
        include: [
          'qdk.config.ts',
          'eslint.config.mjs',
          ...(root.sourceSets.main?.pattern ?? []),
          ...(root.sourceSets.tests?.pattern ?? []),
        ],
        compilerOptions: {
          strictNullChecks: true,
          resolveJsonModule: true,
        },
      },
    },
  });

  // Enable ESLint (+ prettier)
  new EsLint(root, {
    extraTemplateParams: {
      files: false,
    },
  });

  // Sample files
  new SampleFiles(root, {
    files: {
      // src/index.ts
      'src/index.ts': `import { name } from './config.json';

export const sayHello = () => 'Hello ' + name`,
      // src/config.ts
      'src/config.json': {
        type: 'json',
        options: {},
        data: { name: 'Alice ' + new Date().toISOString() },
      },
      // Test file
      'test/index.spec.ts': `
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { describe, expect, it } from 'vitest';
import { sayHello } from '../src/index.js';

describe('index', () => {
  it('say hello', () => {
    // When
    const result = sayHello();
    // Then
    expect(result).toMatch(/^Hello Alice .+$/g);
  });
});
`,
    },
  });

  // Synthetize the root project
  await root.synth();
  // root.synth().then(console.log).catch(console.error)
}

// synth if it's not running tests
if (!isTest) {
  await synthReadmeSample();
}
