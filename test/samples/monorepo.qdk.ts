import { merge } from 'lodash-es';
import { builders } from 'magicast';
import tree from 'tree-console';
import {
  BaseProject,
  Component,
  EsLint,
  JsonFile,
  PackageJson,
  PackageManager,
  PnpmPackageManager,
  Project,
  QdkApp,
  QdkNode,
  SourceCodeFile,
  TextFile,
  Typescript,
} from '../../src/index.js';
// } from 'qdk';

export default class MyApp implements QdkApp {
  monorepo: Project;
  project: Project;

  constructor({ cwd }: { cwd: string }) {
    // Create a new empty project
    const monorepo = new Project(null, {
      name: 'monorepo',
      outdir: 'build/monorepo',
      cwd,
    });
    this.monorepo = monorepo;

    new PnpmPackageManager(monorepo, { workspace: true });
    // new NpmPackageManager(monorepo, {workspace: true });
    new PackageJson(monorepo);
    new Typescript(monorepo, {
      tsconfig: {
        extends: ['@tsconfig/node20@^1.0.0'],
        include: ['src/**/*', 'tests/**/*'],
      },
    });

    const project = new Project(monorepo, {
      name: 'simple',
      outdir: 'services/simple',
      gitignore: false,
    });
    this.project = project;
    new PnpmPackageManager(project);
    // new NpmPackageManager(project);
    new PackageJson(project);
    new Typescript(project, {
      tsconfig: {
        extends: ['@tsconfig/node20'],
        include: ['src/**/*', 'tests/**/*'],
      },
    });

    new EsLint(project);
    new TextFile(
      project,
      {
        basename: 'README.md',
        sample: true,
      },
      'Something else',
    );

    console.log(
      project.findFileOf('package.json', JsonFile),
      project.findFileOf('package.json', JsonFile) ===
        JsonFile.forPath(project, 'package.json'),
    );
    // console.log(project.findFile("package.json"))
    console.log(project.findFileOf('README.md', TextFile)?.change('Hello'));
    console.log(project.findFileOf('README.md', TextFile)?.change('123'));
    console.log(
      project
        .findFileOf('eslint.config.mjs', SourceCodeFile)
        ?.update(source => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const exports: any = source.exports;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access,
          exports.default.$args.push(builders.raw('{ HELLO: TRUE }'));
        }),
    );

    // JsonFile.forPath(monorepo, 'package.json').merge({ type: 'module' });

    PackageJson.required(monorepo).addDeps('simple@workspace:*');

    new Pkgroll(monorepo, {});
    new Pkgroll(project, {});

    new TextFile(
      monorepo,
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
      project,
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

  async synth(): Promise<undefined | void | BaseProject | BaseProject[]> {
    await this.monorepo.synth();
    await PackageManager.required(this.project).run('run build');
    await PackageManager.required(this.monorepo).run('run build');
    console.log(tree.getStringTree([this.monorepo.toTreeNode()]));
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
  await new MyApp({
    cwd: import.meta.dirname,
  }).synth();
}
