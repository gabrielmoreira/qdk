/* eslint-disable @typescript-eslint/class-literal-property-style */
import { difference } from 'lodash-es';
import { join, resolve } from 'node:path';
import tree from 'tree-console';
import type { Jsonifiable } from 'type-fest';
import {
  AnyString,
  assertRequired,
  Component,
  DefaultOptions,
  getErrorCode,
  Gitignore,
  gitignoreDefault,
  HasOptions,
  JsonFile,
  processCwd,
  QdkFile,
  QdkNodeType,
  Scope,
  ScopedNode,
  SynthOptions,
  TextFile,
  unlink,
} from '../index.js';

export const BaseProjectDefaults = {
  gitignore: gitignoreDefault,
  buildDir: 'dist',
  outdir: '.',
  sourceSets: {
    main: {
      pattern: ['src/**/*.ts'],
    },
    tests: {
      pattern: ['test/**/*.ts'],
    },
  } satisfies BaseProjectOptions['sourceSets'],
};

export interface BaseProjectOptions {
  name: string;
  outdir: string;
  cwd: string;
  path: string;
  version?: string;
  description?: string;
  gitignore?: boolean | string[];
  sourceSets?: SourceSets;
  buildDir: string;
}

type SourceSetType = 'main' | 'tests' | 'assets' | AnyString;

type SourceSets = {
  [name in SourceSetType]?: SourceSet;
};
interface SourceSet {
  pattern: string[];
}

export type BaseProjectInitialOptions = Pick<
  BaseProjectOptions,
  'name' | 'version' | 'description'
> &
  Partial<BaseProjectOptions>;

export interface BaseProjectMetadata {
  project: string;
  files: string[];
  custom: Record<string, Jsonifiable>;
}

export abstract class BaseProject<
    T extends BaseProjectOptions = BaseProjectOptions,
  >
  extends ScopedNode
  implements HasOptions<T>
{
  subprojects: BaseProject[] = [];
  components: Component[] = [];
  files: QdkFile[] = [];
  options: T;
  customMetadata: Record<string, Jsonifiable> = {};
  private metadataFile: JsonFile<BaseProjectMetadata>;
  get nodeType(): QdkNodeType {
    return 'project';
  }

  static defaults(
    options: BaseProjectInitialOptions,
    scope?: Scope,
  ): BaseProjectOptions {
    const defaultOpts = DefaultOptions.getWithPartialDefaults(BaseProject, {
      sourceSets: BaseProjectDefaults.sourceSets,
      buildDir: BaseProjectDefaults.buildDir,
      outdir: BaseProjectDefaults.outdir,
    });
    const cwd =
      options?.cwd ??
      scope?.project?.options?.path ??
      defaultOpts?.cwd ??
      processCwd();
    const outdir = options.outdir ?? defaultOpts?.outdir ?? '.';
    const path = join(cwd, outdir);
    return {
      ...defaultOpts,
      ...options,
      buildDir: assertRequired(options.buildDir ?? defaultOpts.buildDir),
      cwd,
      outdir,
      path,
    };
  }
  constructor(scope: Scope | undefined | null = undefined, options: T) {
    super(scope ?? undefined, options.name);
    this.options = options;
    const gitignore = this.options.gitignore ?? true;
    if (gitignore) {
      new Gitignore(this, {
        pattern: gitignore ? BaseProjectDefaults.gitignore : gitignore,
      });
    }
    this.metadataFile = new JsonFile<BaseProjectMetadata>(
      this,
      { basename: '.qdk/meta.json', writeOnSynth: false },
      {
        project: this.options.name,
        custom: this.customMetadata,
        files: this.files
          .filter(file => !file.options.sample)
          .map(it => it.relativePath)
          .sort(),
      },
    );
    this.hook('synth:after', async (options: SynthOptions) => {
      await new TextFile(
        this,
        { basename: '.qdk/tree.txt' },
        tree.getStringTree([this.toTreeNode()]),
      ).write(options);
      const previousFiles = (this.metadataFile.loadedData?.files ?? []).sort();
      const managedFiles = this.files
        .filter(file => !file.options.sample)
        .map(it => it.relativePath)
        .sort();
      const removedFiles = difference(previousFiles, managedFiles);
      this.debug('Previously managed files:', previousFiles);
      this.debug('Files to delete:', removedFiles);
      this.debug('New managed files:', managedFiles);

      this.metadataFile.update(() => ({
        project: this.options.name,
        custom: this.customMetadata,
        files: managedFiles,
      }));
      if (options.removeDeletedFiles ?? true) {
        const sampleFiles = new Set(
          this.files
            .filter(file => file.options.sample)
            .map(it => it.relativePath),
        );
        await Promise.all(
          removedFiles.map(async file => {
            this.debug('Deleting file', file);
            try {
              // skip sample files
              if (!sampleFiles.has(file)) return;
              await unlink(this.resolvePath(file));
            } catch (e) {
              // Do not throw if the file do not exists
              if (getErrorCode(e) === 'ENOENT') return;
              throw e;
            }
          }),
        );
      }
      await this.metadataFile.write(options);
    });
  }

  resolvePath(path: string) {
    return resolve(this.options.path, path);
  }

  addSubproject(project: BaseProject) {
    this.debug('Tracking subproject', project.nodeName);
    this.subprojects.push(project);
  }

  addComponent(component: Component) {
    this.debug('Tracking component', component.nodeName);
    this.components.push(component);
  }

  addFile(file: QdkFile) {
    this.debug('Tracking file', file.nodeName);
    this.files.push(file);
  }

  get sourceSets(): SourceSets {
    return this.options.sourceSets ?? {};
  }

  get buildDir(): string {
    return this.options.buildDir;
  }
}
