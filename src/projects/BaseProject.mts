/* eslint-disable @typescript-eslint/class-literal-property-style */
import { difference } from 'lodash-es';
import { join, relative, resolve } from 'node:path';
import tree from 'tree-console';
import type { Jsonifiable } from 'type-fest';
import {
  AnyString,
  assertRequired,
  Component,
  createOptions,
  getErrorCode,
  HasOptions,
  JsonFile,
  mkdir,
  OptionsMerger,
  PartialOptionsContext,
  processCwd,
  QdkApp,
  QdkAppOptions,
  QdkFile,
  QdkNodeType,
  Scope,
  ScopedNode,
  SynthOptions,
  TextFile,
  unlink,
} from '../index.mjs';

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

type SourceSets = Partial<Record<SourceSetType, SourceSet>>;
interface SourceSet {
  pattern: string[];
}

export type BaseProjectInitialOptionsType = Pick<
  BaseProjectOptionsType,
  'name' | 'version' | 'description'
> &
  Partial<BaseProjectOptionsType>;

const BaseProjectDefaults = {
  buildDir: 'dist',
  outdir: '.',
  sourceSets: {
    main: {
      pattern: ['src/**/*.ts'],
    },
    qdk: {
      pattern: ['qdk.config.mts', '.qdk/components/**/*.ts'],
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
    initialOptions?.cwd ??
    (scope instanceof QdkApp
      ? (scope.options as QdkAppOptions).cwd
      : scope?.project?.options?.path) ??
    processCwd();
  const outdir = initialOptions.outdir ?? defaults?.outdir ?? '.';
  const path = join(cwd, outdir);
  return {
    ...defaults,
    ...initialOptions,
    buildDir: assertRequired(
      initialOptions.buildDir ?? defaults.buildDir,
      'buildDir is required',
    ),
    cwd,
    outdir,
    path,
  };
};

export const BaseProjectOptions = createOptions(
  'BaseProjectOptions',
  BaseProjectDefaults,
  optionsMerger,
);

export interface BaseProjectMetadata {
  project: string;
  files: string[];
  subprojects: string[];
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
  readonly customMetadata: Record<string, Jsonifiable> = {};
  private readonly metadataFile: JsonFile<BaseProjectMetadata>;
  get nodeType(): QdkNodeType {
    return 'project';
  }
  get name(): string {
    return this.options.name;
  }
  get path(): string {
    return this.options.path;
  }
  getCustomMetadata(key: string) {
    return this.customMetadata[key];
  }

  setCustomMetadata(key: string, value: Jsonifiable) {
    this.metadataFile.update(data => {
      data.custom[key] = value;
    });
  }

  constructor(scope: Scope | undefined | null = undefined, opts: T) {
    const options = BaseProjectOptions.getOptions(opts, { scope });
    super(scope ?? undefined, options.name);
    this.options = options as T;
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
        subprojects: this.subprojects
          .map(it => this.relativeTo(it.options.path))
          .sort(),
      },
    );
    this.hook('synth:before', (options: SynthOptions) =>
      this.traceAsyncCall('synth:before', () => this.onBeforeSynth(options)),
    );
    this.hook('synth:after', (options: SynthOptions) =>
      this.traceAsyncCall('synth:after', () => this.onAfterSynth(options)),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async onBeforeSynth(options: SynthOptions) {
    // do nothing
  }

  protected async onAfterSynth(options: SynthOptions) {
    await new TextFile(
      this,
      { basename: '.qdk/tree.txt' },
      tree.getStringTree([this.toTreeNode()]),
    ).write(options);
    const previousFiles = (this.metadataFile.loadedData?.files ?? []).sort();
    const sampleFiles: string[] = [this.metadataFile.options.basename];
    const managedFiles: string[] = [];
    this.files.forEach(it => {
      if (it.options.sample) sampleFiles.push(it.relativePath);
      else managedFiles.push(it.relativePath);
    });
    managedFiles.sort();
    const removedFiles = difference(
      difference(previousFiles, managedFiles),
      sampleFiles, // do not delete files that are now a sample file
    );
    this.debug('Previously managed files:', previousFiles);
    this.debug('Files to delete (orphan files):', removedFiles);
    this.debug('New managed files:', managedFiles);

    // TODO: Detect orphan projects and delete their files.
    // However, be cautious when handling subprojects. Adding a subproject midway might make it seem
    // like certain files are no longer managed, leading to unintentional deletion of valid files.
    // Example: Project(/a, [ Project(/b/c) ]) becomes Project(/a, [ Project(/b, [ Project(/c) ]) ])
    // In this case, it may appear that project /b/c is gone, but it has actually been
    // restructured into nested subprojects.

    this.metadataFile.update(() => ({
      project: this.options.name,
      custom: this.customMetadata,
      files: managedFiles,
      subprojects: this.subprojects
        .map(it => this.relativeTo(it.options.path))
        .sort(),
    }));
    if (options.removeDeletedFiles ?? true) {
      await this.deleteFiles(...removedFiles);
    }
    await this.metadataFile.write(options);
  }

  async deleteFiles(...files: string[]) {
    await this.traceAsyncCall('deleteFiles', async () => {
      await Promise.all(
        files.map(async file => {
          this.debug('Deleting file', file);
          try {
            await unlink(this.resolvePath(file));
          } catch (e) {
            // Do not throw if the file do not exists
            if (getErrorCode(e) === 'ENOENT') return;
            throw e;
          }
        }),
      );
    });
  }

  async makeDirectory(...path: string[]) {
    const fullpath = this.resolvePath(...path);
    await mkdir(fullpath, { recursive: true });
    return fullpath;
  }

  resolvePath(...path: string[]) {
    return resolve(this.options.path, ...path);
  }

  relativeTo(path: string) {
    return relative(this.options.path, path);
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
