import * as qdk from 'qdk';

// Import components from the local './qdk/components/index.js' (it's not an external library)
// It contains reusable components specific to this project
// These components are part of the project code and should be modified as needed.
// They are not part of QDK and won't be updated automatically.
import * as myapp from './.qdk/components/index.js';

// Main application class that sets up the QDK app
export default class MyApp extends qdk.QdkApp {
  constructor({ cwd }: { cwd: string }) {
    super();
    // ----------------------------
    // Default Package.json Options
    // ----------------------------
    // Set defaults for all instances of PackageJson
    qdk.PackageJsonOptions.updateDefaults(pkg => {
      pkg.author = {
        name: 'Gabriel Moreira',
      };
      pkg.private = true;
      pkg.license = 'MIT';
    });

    // Define default versions for dependencies
    qdk.PackageJsonOptions.setDefaultVersions({
      lodash: '^4.17.21',
    });

    // ---------------------------
    // Monorepo Project @repo/root
    // ---------------------------
    const monorepo = this.add(
      myapp.MonorepoProject.create({
        name: '@repo/root',
        description: 'Sample QDK Project',
        version: '0.1.0',
        cwd,
        npmrc: {
          // Configure pnpm for React Native projects
          // More info:
          // - https://docs.expo.dev/guides/monorepos/#can-i-use-another-monorepo-tool-instead-of-yarn-workspaces
          // - https://github.com/pnpm/pnpm/issues/4286
          // - https://github.com/facebook/metro/issues/1042
          'node-linker': 'hoisted',
        },
        // If you haven't used it yet, give it a try: https://mise.jdx.dev/
        mise: {
          tools: {
            java: 'zulu-17',
            node: '20.18.0',
          },
        },
      }),
    );

    // ------------------------------------
    // React Native App Project @repo/myapp
    // ------------------------------------
    const app = new myapp.ReactNativeAppProject(monorepo, {
      name: '@repo/myapp',
    });
    // Hook to modify App.tsx after template generation
    app.hook('onTemplateGenerated', async () => {
      // change App.tsx to invoke the multiply library dependency
      const indexPath = app.resolvePath('App.tsx');
      let content = (await qdk.readFile(indexPath)).toString();

      // Modify App.tsx to include the multiply library
      content = content.replace(
        'import React from ',
        qdk.dedent`
        import { Alert, Button } from 'react-native';
        import { multiply } from '@repo/react-native-multiply';
        import React from 
      `,
      );

      // Add button to invoke the multiply function
      content = content.replace(
        '<Section title="See Your Changes">',
        qdk.dedent`
        <Section title="Workspace lib call">
          <Button onPress={async () => {
                Alert.alert("Native multiply(2, 3)= " + await multiply(2, 3))
            }} title='Native Multiply'/>
        </Section>
        <Section title="See Your Changes">
      `,
      );

      await qdk.writeFile(indexPath, content);
    });

    // ----------------------------------------------------
    // React Native Lib Project @repo/react-native-multiply
    // ----------------------------------------------------
    const rnMultiply = new myapp.ReactNativeLibProject(monorepo, {
      name: '@repo/react-native-multiply',
    });
    app.addDeps(rnMultiply);

    // ----------------------
    // NodeJS Shared packages
    // ----------------------
    const myLibA = new myapp.NodeProject(monorepo, {
      name: '@repo/my-lib-a',
      gitignore: false,
    });

    // --------------------------
    // Typescript shared packages
    // --------------------------
    const myLibB = new myapp.TsProject(monorepo, {
      name: '@repo/my-lib-b',
    });
    myLibB.addDeps(myLibA);

    new myapp.TsProject(monorepo, {
      name: '@repo/my-lib-c',
      packageJson: {
        scripts: {
          clean: 'del-cli dist',
        },
      },
    })
      .addDeps('lodash', 'moment') // Add dependencies
      .addDevDeps('del-cli@^6.0.0') // Add dev dependencies with version pinning
      .addDeps(myLibB); // my-lib-c depends on my-lib-b

    // -----------------------------------------------
    // Shared TypeScript Configurations @repo/tsconfig
    // -----------------------------------------------
    const tsconfigShared = new myapp.NodeProject(monorepo, {
      name: '@repo/tsconfig',
      basedir: 'shared',
    });
    // Create TypeScript configuration file for node
    new qdk.TsConfig(tsconfigShared, {
      tsconfigFilename: 'node.json',
      extends: ['@tsconfig/node20'],
    });
    // Create TypeScript configuration file for react native
    new qdk.TsConfig(tsconfigShared, {
      tsconfigFilename: 'react-native.json',
      extends: ['@tsconfig/react-native'],
    });
  }
}
