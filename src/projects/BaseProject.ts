/* eslint-disable @typescript-eslint/class-literal-property-style */
import { difference } from 'lodash-es';
import { join, resolve } from 'node:path';
import tree from 'tree-console';
import type { Jsonifiable } from 'type-fest';
import {
  AnyString,
  assertRequired,
  Component,
  createOptionsManager,
  getErrorCode,
  Gitignore,
  gitignoreDefault,
  HasOptions,
  JsonFile,
  OptionsMerger,
  PartialOptionsContext,
  processCwd,
  QdkFile,
  QdkNodeType,
  Scope,
  ScopedNode,
  SynthOptions,
  TextFile,
  unlink,
} from '../index.js';

export interface BaseProjectOptionsType {
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

type SourceSetType = 'main' | 'tests' | 'qdk' | 'assets' | AnyString;

type SourceSets = {
  [name in SourceSetType]?: SourceSet;
};
interface SourceSet {
  pattern: string[];
}

export type BaseProjectInitialOptionsType = Pick<
  BaseProjectOptionsType,
  'name' | 'version' | 'description'
> &
  Partial<BaseProjectOptionsType>;

export const BaseProjectDefaults = {
  gitignore: gitignoreDefault,
  buildDir: 'dist',
  outdir: '.',
  sourceSets: {
    main: {
      pattern: ['src/**/*.ts'],
    },
    qdk: {
      pattern: ['qdk.config.ts', 'qdk/**/*.ts'],
    },
    tests: {
      pattern: ['test/**/*.ts'],
    },
  } satisfies BaseProjectOptionsType['sourceSets'],
};

const optionsMerger: OptionsMerger<
  BaseProjectOptionsType,
  BaseProjectInitialOptionsType,
  typeof BaseProjectDefaults,
  PartialOptionsContext
> = (initialOptions, defaults, { scope }) => {
  const cwd =
    initialOptions?.cwd ?? scope?.project?.options?.path ?? processCwd();
  const outdir = initialOptions.outdir ?? defaults?.outdir ?? '.';
  const path = join(cwd, outdir);
  return {
    ...defaults,
    ...initialOptions,
    buildDir: assertRequired(initialOptions.buildDir ?? defaults.buildDir),
    cwd,
    outdir,
    path,
  };
};

export const BaseProjectOptions = createOptionsManager(
  Symbol.for('BaseProjectOptions'),
  BaseProjectDefaults,
  optionsMerger,
);

export interface BaseProjectMetadata {
  project: string;
  files: string[];
  custom: Record<string, Jsonifiable>;
}

export abstract class BaseProject<
    T extends BaseProjectOptionsType = BaseProjectOptionsType,
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

  constructor(scope: Scope | undefined | null = undefined, opts: T) {
    const options = BaseProjectOptions.getOptions(opts, { scope });
    super(scope ?? undefined, options.name);
    this.options = options as T;
    const gitignore = this.options.gitignore ?? true;
    if (gitignore) {
      new Gitignore(this, {
        pattern:
          typeof gitignore === 'boolean'
            ? BaseProjectDefaults.gitignore
            : gitignore,
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
