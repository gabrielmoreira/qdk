import {
  Component,
  EsLint,
  NpmPackageManager,
  PackageJson,
  PackageManager,
  Project,
  QdkApp,
  SampleFiles,
  Scope,
  TsConfigBases,
  Typescript,
} from '../../src/index.js';

export default class MyApp extends QdkApp {
  constructor({ cwd }: { cwd: string }) {
    super();
    // Create a new empty project

    const myProject = this.add(
      Project.create({
        name: 'qdk-sample',
        description: 'Sample QDK Project',
        version: '0.1.0',
        cwd,
        // outdir: 'some-other-folder', // by default outdir is '.' (same as cwd)
      }),
    );

    // Use npm package manager
    new NpmPackageManager(myProject);

    // Customize package.json and add custom dependencies
    new PackageJson(myProject, {
      license: 'MIT',
      module: `${myProject.buildDir}/src/index.js`,
    }) // by default the package type is 'module'
      .addDevDeps('vitest')
      .setScript('test', 'vitest');

    // Typescript TSConfig
    new Typescript(myProject, {
      tsconfig: {
        extends: [TsConfigBases.Node20],
        include: [
          'qdk.config.ts',
          'eslint.config.mjs',
          ...(myProject.sourceSets.main?.pattern ?? []),
          ...(myProject.sourceSets.tests?.pattern ?? []),
          ...(myProject.sourceSets.qdk?.pattern ?? []),
        ],
        compilerOptions: {
          outDir: myProject.buildDir,
          strictNullChecks: true,
          resolveJsonModule: true,
        },
      },
    });

    // Enable ESLint (+ prettier)
    new EsLint(myProject, {
      templateParams: {
        rules: {
          '@typescript-eslint/no-unsafe-call': 'off',
        },
      },
    });

    // To automatically run linting after synthesizing the project,
    // use the following hook. This ensures ESLint fixes any issues:
    this.hook('synth:after', async () => {
      await PackageManager
        // Find the package manager configured for this project
        .required(myProject)
        // Run: npx eslint --fix to automatically correct linting issues
        .exec('eslint --fix');
    });

    // You can extract your features into components
    // to enable reuse across different projects.
    new MySampleFiles(myProject);
  }
}

export class MySampleFiles extends Component {
  constructor(scope: Scope) {
    super(scope, undefined);

    // Sample files
    new SampleFiles(this, {
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
}
