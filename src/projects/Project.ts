/* eslint-disable @typescript-eslint/class-literal-property-style */
import { difference } from 'lodash-es';
import { join, resolve } from 'node:path';
import tree from 'tree-console';
import type { Jsonifiable } from 'type-fest';
import {
  AnyString,
  Component,
  getErrorCode,
  Gitignore,
  gitignoreDefault,
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

export const ProjectDefaults = {
  gitignore: gitignoreDefault,
  buildDir: 'dist',
  sourceSets: {
    main: {
      pattern: ['src/**/*.ts'],
    },
    tests: {
      pattern: ['test/**/*.ts'],
    },
  } satisfies ProjectOptions['sourceSets'],
};

export interface ProjectOptions {
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

export type ProjectInitialOptions = Pick<
  ProjectOptions,
  'name' | 'version' | 'description'
> &
  Partial<ProjectOptions>;

export interface ProjectMetadata {
  project: string;
  files: string[];
  custom: Record<string, Jsonifiable>;
}

export abstract class Project<
  T extends ProjectOptions = ProjectOptions,
> extends ScopedNode {
  subprojects: Project[] = [];
  components: Component[] = [];
  files: QdkFile[] = [];
  options: T;
  customMetadata: Record<string, Jsonifiable> = {};
  private metadataFile: JsonFile<ProjectMetadata>;
  get nodeType(): QdkNodeType {
    return 'project';
  }

  static defaults(
    options: ProjectInitialOptions,
    scope?: Scope,
  ): ProjectOptions {
    const cwd = options?.cwd ?? scope?.project?.options?.path ?? processCwd();
    const outdir = options.outdir ?? '.';
    const path = join(cwd, outdir);
    return {
      ...options,
      cwd,
      outdir,
      path,
      sourceSets: options.sourceSets ?? ProjectDefaults.sourceSets,
      buildDir: options.buildDir ?? ProjectDefaults.buildDir,
    };
  }
  constructor(scope: Scope | undefined | null = undefined, options: T) {
    super(scope ?? undefined, options.name);
    this.options = options;
    const gitignore = this.options.gitignore ?? true;
    if (gitignore) {
      new Gitignore(this, {
        pattern: gitignore ? ProjectDefaults.gitignore : gitignore,
      });
    }
    this.metadataFile = new JsonFile<ProjectMetadata>(
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
      ).write();
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
      await this.metadataFile.write();
    });
  }

  resolvePath(path: string) {
    return resolve(this.project.options.path, path);
  }

  addSubproject(project: Project) {
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
