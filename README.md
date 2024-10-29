# QDK - Quick Development Kit

![NPM Version](https://img.shields.io/npm/v/qdk)

**⚠️ Important: This project is experimental and actively evolving. Expect frequent updates and breaking changes. Use cautiously.**

QDK simplifies configuration file generation via TypeScript, offering flexibility like Projen but with more control over project configurations.

## Why QDK?

QDK was designed to address the complexity seen in tools like Projen, which incorporates many elements, responsibilities, and features for code generation across various programming languages. Such design choices can lead to cluttered projects, as base classes like `NodeProject` automatically pull in numerous dependencies (e.g., Gitpod, DevContainer, AWS services). As a result, users often need to disable unwanted features, complicating customization.

In contrast, QDK specifically targets Node.js and TypeScript projects, focusing on:

- **Generate only what’s requested**: Files are only created when explicitly requested. For instance, if you need a `package.json`, instantiate the `PackageJson` component; if you want a `.gitignore`, instantiate the `Gitignore`, and so on.
- **Minimal coupling**: Components are designed to be as independent as possible. However, logical dependencies do exist; for example, multiple components may need to communicate with `package.json` to add dependencies or utilize the package manager for command execution.
- **Composable design**: QDK favors small, focused components over large, complex objects, allowing projects to define their own component defaults without inheriting from a bloated base.
- **Customizable defaults**: Users can set options for individual components while establishing global default settings, enhancing overall flexibility.
- **No runtime impact**: QDK does not add any code, libraries, or dependencies to your project's runtime. It solely serves to generate code based on a central configuration. Additionally, QDK can be easily removed from your workspace; ejecting it is as simple as deleting the `.qdk` directories and the `qdk.config.ts` file.

You may wonder, "But won't my project need to instantiate several components instead of having nice defaults decided by the project?" In this case, I don't see it as a drawback, but rather as a feature. The JavaScript community evolves rapidly, and different techniques, frameworks, and libraries require distinct configurations. It's challenging to decide on defaults and behaviors that broadly meet everyone's needs. Thus, QDK's approach is to help manage the files that need to be generated while providing small components that allow you to create your own defaults. 

To assist in deciding between different approaches, QDK will focus on creating project templates that you can use as a starting point for your project, allowing you to customize the organization in a way that is most effective for you.

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

### OpenTelemetry OTLP Tracing

QDK now supports OpenTelemetry OTLP tracing, which allows you to visualize the performance of your QDK applications syntheses. This feature can help you identify bottlenecks and optimize your code. For detailed instructions on setting it up, please refer to the [tracing documentation](./docs/tracing.md).

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Contributing

Feel free to open issues and submit pull requests to help improve QDK!
