import * as qdk from '#qdk';

export default class MyApp extends qdk.QdkApp {
  constructor(options: qdk.QdkAppOptions) {
    super(options);
    // Create a new empty project

    const project = new qdk.Project(this, {
      name: 'qdk-sample',
      description: 'Sample QDK Project',
      version: '0.1.0',
      // outdir: 'somewhere/else', // by default outdir is '.'
    });

    // Add .gitignore to the project
    new qdk.Gitignore(project);

    // Use npm package manager
    new qdk.NpmPackageManager(project);

    // Customize package.json and add custom dependencies
    new qdk.PackageJson(project, {
      license: 'MIT',
      module: `${project.buildDir}/src/index.js`,
    }) // by default the package type is 'module'
      .addDevDeps('vitest')
      .setScript('test', 'vitest');

    // Typescript TSConfig
    new qdk.Typescript(project, {
      tsconfig: {
        extends: [qdk.TsConfigBases.Node20],
        include: [
          'qdk.config.mts',
          'eslint.config.mjs',
          ...(project.sourceSets.main?.pattern ?? []),
          ...(project.sourceSets.tests?.pattern ?? []),
          ...(project.sourceSets.qdk?.pattern ?? []),
        ],
        compilerOptions: {
          outDir: project.buildDir,
          strictNullChecks: true,
          resolveJsonModule: true,
        },
      },
    });

    // Enable ESLint (+ prettier)
    new qdk.EsLint(project, {
      templateParams: {
        rules: {
          '@typescript-eslint/no-unsafe-call': 'off',
        },
      },
    });

    // To automatically run linting after synthesizing the project,
    // use the following hook. This ensures ESLint fixes any issues:
    this.hook('synth:after', async () => {
      await qdk.PackageManager
        // Find the package manager configured for this project
        .required(project)
        // Run: npx eslint --fix to automatically correct linting issues
        .pkgExec('eslint --fix');
    });

    // You can extract your features into components
    // to enable reuse across different projects.
    new MySampleFiles(project);
  }
}

export class MySampleFiles extends qdk.Component {
  constructor(scope: qdk.Scope) {
    super(scope, {});

    // Sample files
    new qdk.SampleFiles(this, {
      files: {
        // src/index.ts
        'src/index.ts': qdk.dedent`
          import { name } from './config.json';
          export const sayHello = () => 'Hello ' + name
        `,
        // src/config.ts
        'src/config.json': {
          type: 'json',
          options: {},
          data: { name: 'Alice ' + new Date().toISOString() },
        },
        // Test file
        'test/index.spec.ts': qdk.dedent`
          import { describe, expect, it } from 'vitest';
          import { sayHello } from '../src/index.mjs';

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
