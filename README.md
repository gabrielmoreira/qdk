# QDK - Quick Development Kit

**⚠️ Important: This project is in an experimental phase and is under active development. Expect frequent changes and updates as we continue to evolve the toolkit. Breaking changes will occur as features are improved and refined. Use at your own discretion.**

QDK (Quick Development Kit) is a toolkit designed to simplify the generation of configuration files through TypeScript. It's inspired by tools like Projen but provides more flexibility for creating and managing any kind of configuration file in your projects.

## Why QDK?

QDK was created to offer flexibility and full control over project configuration, avoiding the pitfalls of overly complex base classes with too many responsibilities, like those found in tools such as Projen.

Some tools suffer from **"kitchen sink"** or **"tight coupling"** antipatterns, where core classes like `NodeProject` drag in unrelated dependencies (Gitpod, DevContainer, AWS) by default. This forces users to manually disable unwanted features, which complicates inheritance and makes it confusing to decide whether to rely on built-in properties (e.g., from `NodeProject`) or instantiate separate components.

### QDK is built around the following principles:

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

### Step 1: Create an empty folder

Start by creating a new empty folder for your project.

### Step 2: Create a `qdk.config.ts` file

Run the following commands to initialize a QDK configuration:

```bash
npx qdk init
```

### Step 3: Synthesize your project configuration:

Run the following commands to initialize npm and set up your project:

```sh
npx qdk synth
```

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Contributing

Feel free to open issues and submit pull requests to help improve QDK!
