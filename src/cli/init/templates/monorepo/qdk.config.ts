import * as qdk from 'qdk';
import * as myapp from './qdk/index.js';

export default class MyApp extends qdk.QdkApp {
  constructor({ cwd }: { cwd: string }) {
    super();
    // Set some nice defaults for all instances of a PackageJson
    qdk.PackageJsonOptions.updateDefaults(pkg => {
      pkg.author = {
        name: 'Gabriel Moreira',
      };
      pkg.private = true;
      pkg.license = 'MIT';
    });

    // You can also define default versions for any dependency.
    qdk.PackageJsonOptions.setDefaultVersions({
      lodash: '^4.17.21',
    });

    // Create a monorepo project (pnpm)
    const monorepo = this.add(
      myapp.MonorepoProject.create({
        name: '@repo/root',
        description: 'Sample QDK Project',
        version: '0.1.0',
        cwd,
        npmrc: {
          // react native projects requires node-linker=hoisted on pnpm project
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

    new myapp.ReactNativeAppProject(monorepo, {
      name: '@repo/my-app',
    });

    new myapp.ReactNativeAppProject(monorepo, {
      name: '@repo/some-other-app',
    });

    const myLibA = new myapp.NodeProject(monorepo, {
      name: '@repo/my-lib-a',
      gitignore: false,
    });

    const myLibB = new myapp.TsProject(monorepo, {
      name: '@repo/my-lib-b',
    });
    myLibB.addDeps(myLibA);

    new myapp.TsProject(monorepo, {
      name: '@repo/my-lib-c',
      packageJson: {
        scripts: {
          clean: 'rimraf dist',
        },
      },
    }) // you can easily add your dependencies
      .addDeps('lodash', 'moment')
      // ... and you can also pin the version
      .addDevDeps('rimraf@^6.0.1')
      // or depend from workspace projects
      .addDeps(myLibB);

    const tsconfigShared = new myapp.NodeProject(monorepo, {
      name: '@repo/tsconfig',
      basedir: 'shared',
    });
    new qdk.TsConfig(tsconfigShared, {
      tsconfigFilename: 'node.json',
      extends: ['@tsconfig/node20'],
    });
    new qdk.TsConfig(tsconfigShared, {
      tsconfigFilename: 'react-native.json',
      extends: ['@tsconfig/react-native'],
    });
  }
}
