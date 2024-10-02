import merge from 'lodash-es/merge.js';
import { dirname, join } from 'node:path';
import tree from 'tree-console';
import {
  Component,
  ESLint,
  JsonFile,
  Node,
  PackageJson,
  PackageManager,
  PnpmPackageManager,
  SimpleProject,
  TextFile,
  Typescript,
} from '../src/index.js';
const __dirname = dirname(new URL(import.meta.url).pathname);

const monorepo = new SimpleProject(null, {
  name: 'monorepo',
  outdir: 'monorepo',
  cwd: join(__dirname, '../build'),
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

new ESLint(project);
new TextFile(
  project,
  {
    base: 'README.md',
    sample: true,
  },
  'Something else',
);

console.log(project.findFileOf('package.json', JsonFile));
// console.log(project.findFile("package.json"))
console.log(project.findFileOf('README.md', TextFile)?.change('Hello'));
console.log(project.findFileOf('README.md', TextFile)?.change('123'));

// JsonFile.forPath(monorepo, 'package.json').merge({ type: 'module' });

PackageJson.required(monorepo).addDeps('simple@workspace:*');

interface PkgrollOptions {}
class Pkgroll extends Component {
  constructor(scope: Node, options: PkgrollOptions) {
    super(scope, options);
    const buildDir = this.project.buildDir;
    PackageJson.required(scope)
      .addDevDeps('pkgroll')
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
    base: 'src/index.ts',
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
    base: 'src/index.ts',
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

// console.log(rootPackageJson.findComponent(JsonFile))
