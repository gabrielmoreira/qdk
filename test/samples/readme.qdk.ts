import {
  EsLint,
  NpmPackageManager,
  PackageJson,
  Project,
  QdkApp,
  SampleFiles,
  TsConfigBases,
  Typescript,
} from '../../src/index.js';
// } from 'qdk';

export default class MyApp implements QdkApp {
  root: Project;

  constructor({ cwd }: { cwd: string }) {
    // Create a new empty project
    this.root = new Project(null, {
      name: 'qdk-sample',
      outdir: '.',
      cwd,
    });

    // Use npm package manager (set this project as the workspace root)
    new NpmPackageManager(this.root, { workspace: true });

    // Customize package.json and add custom dependencies
    new PackageJson(this.root, { type: 'module' })
      .addDevDeps('qdk', 'tsx', 'vitest')
      .setScript('qdk', 'tsx qdk.config.ts synth')
      .setScript('test', 'vitest');

    // Typescript TSConfig
    new Typescript(this.root, {
      tsconfig: {
        extends: [TsConfigBases.Node20],
        include: [
          'qdk.config.ts',
          'eslint.config.mjs',
          ...(this.root.sourceSets.main?.pattern ?? []),
          ...(this.root.sourceSets.tests?.pattern ?? []),
        ],
        compilerOptions: {
          strictNullChecks: true,
          resolveJsonModule: true,
        },
      },
    });

    // Enable ESLint (+ prettier)
    new EsLint(this.root, {
      extraTemplateParams: {
        files: false,
      },
    });

    // Sample files
    new SampleFiles(this.root, {
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
  }
  async synth(): Promise<void> {
    // Synthetize the root project
    await this.root.synth();
  }
}

/*
 * Run the following commands:
 * ```sh
 *   npm init -y; npm pkg set type="module" scripts.qdk="tsx qdk.config.ts synth"; npm install --save-dev qdk tsx
 *   npx tsx qdk.config.ts
 * ```
 * After that you can run:
 * ```sh
 * npm run qdk
 * ```
 */

if (process.argv.slice(2).includes('synth')) {
  await new MyApp({
    cwd: import.meta.dirname,
  }).synth();
}
