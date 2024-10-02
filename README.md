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

### Step 2: Create a new file `qdk.ts` with the following content:

```ts
import {
  ESLint,
  NpmPackageManager,
  PackageJson,
  SimpleProject,
  TextFile,
  TsConfigBases,
  Typescript,
} from 'qdk';

// Create a new empty project in the current directory
const root = new SimpleProject(null, {
  name: 'qdk-sample',
  outdir: '.',
  cwd: import.meta.dirname,
});

// Use npm package manager (set this project as the workspace root)
new NpmPackageManager(root, { workspace: true });

// Customize package.json and add custom dependencies
new PackageJson(root)
  .addDevDeps('qdk', 'tsx')
  .setScript('qdk', 'tsx qdk.ts')
  .update(pkg => {
    pkg.type = 'module';
  });

// Typescript TSConfig
new Typescript(root, {
  tsconfig: {
    extends: [TsConfigBases.Node20],
    config: {
      include: [
        'qdk.ts',
        'eslint.config.mjs',
        ...(root.sourceSets.main?.pattern ?? []),
        ...(root.sourceSets.tests?.pattern ?? []),
      ],
      compilerOptions: {
        strictNullChecks: true,
      },
    },
  },
});

// Enable ESLint (+ prettier)
new ESLint(root);

//
// custom patch example:
//
root.findFileOf('eslint.config.mjs', TextFile)!.update(data => {
  return data.replace(
    `["eslint.config.mjs", "*.ts", "*.js"]`,
    "['eslint.config.mjs']",
  );
});

// Synthetize the root project
await root.synth();

// Run the setup with the following commands:
//   npm init -y; npm pkg set type="module"; npm install --save-dev qdk; npx tsx qdk.ts
// 
// To syncronize the project in the future, use:
//   npm run qdk
```

### Step 3: Initialize npm and run qdk:
Run the following commands to initialize npm and set up your project:

```sh
npm init -y; npm pkg set type="module"; npm install --save-dev qdk;
npx tsx qdk.ts
```

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## Contributing
Feel free to open issues and submit pull requests to help improve QDK!
