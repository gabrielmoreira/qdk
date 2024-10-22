import { merge } from 'lodash-es';
import { builders } from 'magicast';
import {
  Component,
  EsLint,
  JsonFile,
  PackageJson,
  PackageManager,
  PnpmPackageManager,
  Project,
  QdkApp,
  QdkAppOptions,
  QdkNode,
  SourceCodeFile,
  TextFile,
  Typescript,
} from '../../src/index.js';
// } from 'qdk';

export default class CrazyApp extends QdkApp {
  constructor(options: QdkAppOptions) {
    super(options);
    // Create a new empty project
    const crazyproj = new Project(this, {
      name: 'crazyproj',
      outdir: 'build/crazyproj',
    });

    new PnpmPackageManager(crazyproj, { workspace: true });
    // new NpmPackageManager(crazyproj, {workspace: true });
    new PackageJson(crazyproj);
    new Typescript(crazyproj, {
      tsconfig: {
        extends: ['@tsconfig/node20@^1.0.0'],
        include: ['src/**/*', 'tests/**/*'],
      },
    });

    const subproject = new Project(crazyproj, {
      name: 'simple',
      outdir: 'services/simple',
      gitignore: false,
    });
    this.hook('after:synth', async () => {
      await PackageManager.required(subproject).run('run build');
      await PackageManager.required(crazyproj).run('run build');
    });
    new PnpmPackageManager(subproject);
    // new NpmPackageManager(subproject);
    new PackageJson(subproject);
    new Typescript(subproject, {
      tsconfig: {
        extends: ['@tsconfig/node20'],
        include: ['src/**/*', 'tests/**/*'],
      },
    });

    new EsLint(subproject);
    new TextFile(
      subproject,
      {
        basename: 'README.md',
        sample: true,
      },
      'Something else',
    );

    console.log(
      'package.json is the same?',
      subproject.findFileOf('package.json', JsonFile) ===
        JsonFile.forPath(subproject, 'package.json'),
    );
    // (project.findFile("package.json"))
    subproject.findFileOf('README.md', TextFile)?.change('Hello');
    subproject.findFileOf('README.md', TextFile)?.change('123');

    subproject
      .findFileOf('eslint.config.mjs', SourceCodeFile)
      ?.update(source => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const exports: any = source.exports;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access,
        exports.default.$args.push(builders.raw('{ HELLO: TRUE }'));
      });

    // JsonFile.forPath(crazyproj, 'package.json').merge({ type: 'module' });

    PackageJson.required(crazyproj).addDeps('simple@workspace:*');

    new Pkgroll(crazyproj, {});
    new Pkgroll(subproject, {});

    new TextFile(
      crazyproj,
      {
        basename: 'src/index.ts',
        sample: true,
      },
      `export type A = 'a';
export const a = 'a' satisfies A;
import { B } from 'simple';
console.log(B)`,
    );
    new TextFile(
      subproject,
      {
        basename: 'src/index.ts',
        sample: true,
      },
      `export const B = 'B';`,
    );
    // new TextFile(
    //   project,
    //   {
    //     base: 'src/test.ts',
    //   },
    //   `export const B = 'B';`
    // );
  }
}

interface PkgrollOptions {
  version?: string;
}
class Pkgroll extends Component<PkgrollOptions> {
  constructor(scope: QdkNode, options: PkgrollOptions) {
    super(scope, options);
    const buildDir = this.project.buildDir;
    PackageJson.required(scope)
      .addDevDeps(
        'pkgroll' + (this.options?.version ? `@${this.options?.version}` : ''),
      )
      .update(data => {
        return merge(data, {
          scripts: {
            build: 'pkgroll',
          },
          main: `./${buildDir}/index.cjs`,
          module: `./${buildDir}/index.mjs`,
          types: `./${buildDir}/index.d.cts`,
          exports: {
            require: {
              types: `./${buildDir}/index.d.cts`,
              default: `./${buildDir}/index.cjs`,
            },
            import: {
              types: `./${buildDir}/index.d.mts`,
              default: `./${buildDir}/index.mjs`,
            },
          },
        });
      });
  }
}

if (process.argv.slice(2).includes('synth')) {
  await new CrazyApp({
    cwd: import.meta.dirname,
  }).synth();
}

// ---- FOR TESTS: begin ----
//export { vol } from 'memfs';
export { PackageJsonOptions } from '../../src/index.js';
// ---- FOR TESTS: end ----
