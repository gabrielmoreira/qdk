# QDK - Quick Development Kit

**⚠️ Important: This project is in an experimental phase and is under active development. Expect frequent changes and updates as we continue to evolve the toolkit. Breaking changes may occur as features are improved and refined. Use at your own discretion.**


QDK (Quick Development Kit) is a toolkit designed to simplify the generation of configuration files through TypeScript. It's inspired by tools like Projen but provides more flexibility for creating and managing any kind of configuration file in your projects.

## Features

- Generate configuration files using TypeScript
- Easily customize your `package.json` with scripts and dependencies
- Manage TypeScript configurations, ESLint setups, and more

## Quickstart

Follow these steps to create a sample project with QDK:

### Step 1: Create an empty folder

Start by creating a new empty folder for your project.

### Step 2: Create a new file `qdk.config.ts` with the following content:

```ts
import {
  EsLint,
  NpmPackageManager,
  PackageJson,
  SimpleProject,
  TsConfigBases,
  Typescript,
  SampleFiles,
} from 'qdk';

const rootPath = import.meta.dirname;

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

// Run the setup with the following commands:
//   npm init -y; npm pkg set type="module" scripts.qdk="tsx qdk.config.ts"; npm install --save-dev qdk tsx
//
// To syncronize the project in the future, use:
//   npm run qdk
//
```

### Step 3: Initialize npm and run qdk:
Run the following commands to initialize npm and set up your project:

```sh
npm init -y; npm pkg set type="module" scripts.qdk="tsx qdk.config.ts"; npm install --save-dev qdk tsx
npm run qdk
```

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## Contributing
Feel free to open issues and submit pull requests to help improve QDK!
