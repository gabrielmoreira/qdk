import { merge } from 'lodash-es';
import { builders } from 'magicast';
import tree from 'tree-console';
import {
  Component,
  EsLint,
  JsonFile,
  PackageJson,
  PackageManager,
  PnpmPackageManager,
  QdkNode,
  SimpleProject,
  SourceCodeFile,
  TextFile,
  Typescript,
} from '../../src/index.js';
// } from 'qdk';

const isTest = process.env.NODE_ENV === 'test';
const rootPath = isTest ? undefined : import.meta.dirname;

export async function synthMonorepo() {
  const monorepo = new SimpleProject(null, {
    name: 'monorepo',
    outdir: 'build/monorepo',
    cwd: rootPath,
  });
  new PnpmPackageManager(monorepo, { workspace: true });
  // new NpmPackageManager(monorepo, {workspace: true });
  new PackageJson(monorepo);
  new Typescript(monorepo, {
    tsconfig: {
      extends: ['@tsconfig/node20'],
      config: { include: ['src/**/*', 'tests/**/*'] },
    },
  });

  const project = new SimpleProject(monorepo, {
    name: 'simple',
    outdir: 'services/simple',
    gitignore: false,
  });
  new PnpmPackageManager(project);
  // new NpmPackageManager(project);
  new PackageJson(project);
  new Typescript(project, {
    tsconfig: {
      extends: ['@tsconfig/node20'],
      config: { include: ['src/**/*', 'tests/**/*'] },
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

  console.log(project.findFileOf('package.json', JsonFile));
  // console.log(project.findFile("package.json"))
  console.log(project.findFileOf('README.md', TextFile)?.change('Hello'));
  console.log(project.findFileOf('README.md', TextFile)?.change('123'));
  console.log(
    project.findFileOf('eslint.config.mjs', SourceCodeFile)?.update(source => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const exports: any = source.exports;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access,
      exports.default.$args.push(builders.raw('{ HELLO: TRUE }'));
    }),
  );

  // JsonFile.forPath(monorepo, 'package.json').merge({ type: 'module' });

  PackageJson.required(monorepo).addDeps('simple@workspace:*');

  interface PkgrollOptions {
    version?: string;
  }
  class Pkgroll extends Component<PkgrollOptions> {
    constructor(scope: QdkNode, options: PkgrollOptions) {
      super(scope, options);
      const buildDir = this.project.buildDir;
      PackageJson.required(scope)
        .addDevDeps(
          'pkgroll' +
            (this.options?.version ? `@${this.options?.version}` : ''),
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
  await monorepo.synth();
  await PackageManager.required(project).run('run build');
  await PackageManager.required(monorepo).run('run build');

  console.log(tree.getStringTree([monorepo.toTreeNode()]));
}

// synth if it's not running tests
if (!isTest) {
  await synthMonorepo();
}
