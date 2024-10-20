# QDK - Quick Development Kit

**⚠️ Important: This project is in an experimental phase and is under active development. Expect frequent changes and updates as we continue to evolve the toolkit. Breaking changes will occur as features are improved and refined. Use at your own discretion.**

QDK (Quick Development Kit) is a toolkit designed to simplify the generation of configuration files through TypeScript. It's inspired by tools like Projen but provides more flexibility for creating and managing any kind of configuration file in your projects.

## Why QDK?

QDK was created to offer flexibility and full control over project configuration, avoiding the pitfalls of overly complex base classes with too many responsibilities, like those found in tools such as Projen.

Some tools suffer from **"kitchen sink"** or **"tight coupling"** antipatterns, where core classes like `NodeProject` drag in unrelated dependencies (Gitpod, DevContainer, AWS) by default. This forces users to manually disable unwanted features, which complicates inheritance and makes it confusing to decide whether to rely on built-in properties (e.g., from `NodeProject`) or instantiate separate components.

### QDK is built around the following principles

- **Only generate what’s explicitly requested.**
  Avoid unnecessary features or configurations unless they are specifically requested by the user.

- **Avoid creating components that manage unrelated components.**
  Maintain clear boundaries between components to prevent unintended dependencies and keep project configurations clean.

- **Let users compose components and promote composability.**
  Allow full control over how components are combined and enable users to mix and match them effortlessly, ensuring flexibility in project setups.

- **Ensure easy extensibility with flexible defaults.**
  Provide sensible defaults that are easily adjustable without requiring complex overrides or patches.

We believe that companies with multiple teams often have specific setups tailored to their unique workflows, including configurations for pipelines, tooling, folder structures, etc. These setups are essential for maintaining efficiency and consistency across projects and teams, allowing for precise control over what is being generated and ensuring that users can easily understand and verify the outputs. Predictability is a core necessity of the tool, as it enables effective project management and reduces uncertainties in the development process.

QDK adopts a modular, component-centric approach that prioritizes clarity, customizability, and composability.

## Features

- Generate configuration files using TypeScript
- Easily customize your `package.json` with scripts and dependencies
- Manage TypeScript configurations, ESLint setups, and more

## Quickstart

Follow these steps to create a sample project with QDK:

### Step 1: Initialize a new QDK project

Run the following commands to create a new `qdk.config.ts` file:

```bash
npx qdk init
```

For a blank project use:

```sh
npx qdk init --blank
```

**Note: For a more advanced project setup, consider trying:**

```sh
npx qdk init --template monorepo
```

### Step 2: Synthesize your project configuration

Run the following commands to initialize npm and set up your project:

```sh
npx qdk synth
```

## Exploring QDK Classes

The `qdk.QdkApp` class is the main entry point for your QDK application. It handles the configuration and synthesis of your project.

### Example: Creating a Basic Project

```ts
import * as qdk from 'qdk';

export default class MyApp extends qdk.QdkApp {
  constructor(options: qdk.QdkAppOptions) {
    super(options);

    // Initialize a new project with basic information
    const project = new qdk.Project(this, {
      name: 'qdk-sample',
      description: 'Sample QDK Project',
      version: '0.1.0',
    });

    // Attach a package manager to the project
    new qdk.NpmPackageManager(project);
    // If you prefer pnpm, use the line below:
    // new qdk.PnpmPackageManager(project);

    // Add a package.json to the project (it uses project name, description, and version)
    new qdk.PackageJson(project, {
      license: 'MIT',
    })
      .addDevDeps('vitest')
      .setScript('test', 'vitest');

    // Optionally create sample files for the project (created once, but never updated)
    new qdk.SampleFiles(project, {
      files: {
        'README.md':
          'Use npx qdk synth to synthetize this project configurations',
      },
    });

    // Create a managed file (this file will be updated whenever 'qdk synth' is run)
    new qdk.TextFile(
      project,
      {
        basename: '.editorconfig',
      },
      // qdk.dedent helps you strips indentation from multi-line strings.
      qdk.dedent`
        root = true

        [*]
        charset = utf-8
        end_of_line = lf
        insert_final_newline = true
        indent_style = space
        indent_size = 2
        trim_trailing_whitespace = true
    `,
    );
  }
}
```

### Other Examples

QDK offers various templates to help you get started quickly, each tailored for different project types. Here are some options you can try:

#### Create a Blank Project
  
This initializes a project without any pre-configured settings, giving you complete freedom to set it up as you wish.

```sh  
npx qdk init --blank
# same as: npx qdk init --template blank
```

#### Create a Simple Project

Use this template for a project setup with some basic configurations already in place.

```sh  
npx qdk init --template simple
```

#### Create a Monorepo

This initializes a monorepo structure, allowing you to manage multiple projects within a single repository efficiently.

```sh  
npx qdk init --template monorepo
```

### Extend with Components

Encapsulating common configurations into reusable components can simplify your project setup. Here’s a quick guide to creating a default setup component:

#### 1. Create a component

```ts
export class MyDefaultSetup extends qdk.Component {
  constructor(scope: qdk.Scope) {
    super(scope, {});

    // Add NPM Package Manager
    new qdk.NpmPackageManager(this);

    // Create package.json with default settings
    new qdk.PackageJson(this, {
      license: 'MIT',
    })
      .addDevDeps('prettier')
      .setScript('format', 'prettier . --write');
  }
}
```

#### 2. Add it to your project

```ts
import * as qdk from 'qdk';
import { MyDefaultSetup } from './MyDefaultSetup'; // Adjust the path as needed

export default class MyApp extends qdk.QdkApp {
  constructor(options: qdk.QdkAppOptions) {
    super(options);

    // Create a new project
    const project = new qdk.Project(this, {
      name: 'qdk-sample',
      description: 'Sample QDK Project',
      version: '0.1.0',
    });

    // Initialize your default setup for the project
    new MyDefaultSetup(project);
  }
}
```

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Contributing

Feel free to open issues and submit pull requests to help improve QDK!
