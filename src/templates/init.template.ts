export const basic = `
import {
  EsLint,
  NpmPackageManager,
  PackageJson,
  Project,
  TsConfigBases,
  Typescript,
  SampleFiles,
} from 'qdk';

// Create a new empty project
const root = Project.create({
  name: 'qdk-sample',
  // cwd: import.meta.dirname,
});

// Use npm package manager (set this project as the workspace root)
new NpmPackageManager(root, { workspace: true });

// Customize package.json and add custom dependencies
new PackageJson(root, {
  type: 'module',
  scripts: {
    qdk: 'qdk synth',
    test: 'vitest',
  },
}).addDevDeps('qdk', 'tsx', 'vitest');

// Typescript TSConfig
new Typescript(root, {
  tsconfig: {
    extends: [TsConfigBases.Node20],
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
});

// Enable ESLint (+ prettier)
new EsLint(root);

// Sample files
new SampleFiles(root, {
  files: {
    // src/index.ts
    'src/index.ts': \`import { name } from './config.json';

export const sayHello = () => 'Hello ' + name\`,
    // src/config.ts
    'src/config.json': {
      type: 'json',
      options: {},
      data: { name: 'Alice ' + new Date().toISOString() },
    },
    // Test file
    'test/index.spec.ts': \`
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
\`,
  },
});

export default root;

/*
1) To syncronize the project in the future, use:
  npm run qdk
*/

`.trim();
