/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/class-literal-property-style */
import {
  applyPatches,
  enablePatches,
  freeze,
  Objectish,
  Patch,
  produce,
} from 'immer';
import { dirname, join } from 'node:path';
import * as prettier from 'prettier';
import {
  createFile,
  createOptionsManager,
  existsSync,
  FsFile,
  mkdir,
  OptionsMerger,
  Prettier,
  PrettierOptions,
  QdkNode,
  QdkNodeType,
  readFile,
  readFileSync,
  relativeToCwd,
  Scope,
  SynthOptions,
  writeFile,
} from '../index.js';
enablePatches();

export interface QdkFileOptionsType {
  cwd: string;
  basename: string;
  readOnInit?: boolean;
  sample?: boolean;
  writeOnSynth?: boolean;
  freeze?: boolean;
  formatOnCheck?: boolean | prettier.Options;
  formatOnWrite?: boolean | prettier.Options;
}
export type QdkFileInitialOptionsType = Partial<QdkFileOptionsType> &
  Pick<QdkFileOptionsType, 'basename'>;

const QdkFileDefaults = {
  sample: false,
  freeze: true,
  readOnInit: true,
  writeOnSynth: true,
  formatOnCheck: true,
  formatOnWrite: true,
} satisfies Omit<QdkFileOptionsType, 'cwd' | 'basename'>;

const optionsMerger: OptionsMerger<
  QdkFileOptionsType,
  QdkFileInitialOptionsType,
  typeof QdkFileDefaults
> = (initialOptions, defaults, { scope }) => {
  return {
    ...defaults,
    ...initialOptions,
    cwd:
      initialOptions.cwd ??
      join(scope.project.options.cwd, scope.project.options.outdir),
  };
};

export const QdkFileOptions = createOptionsManager(
  Symbol.for('QdkFileOptions'),
  QdkFileDefaults,
  optionsMerger,
);

export interface FileCodec<T = any> {
  serializer: (data: T) => Buffer;
  deserializer: (buffer: Buffer) => T;
}
export abstract class QdkFile<
  T = any,
  O extends QdkFileOptionsType = QdkFileOptionsType,
> extends QdkNode {
  protected file: FsFile;
  protected codec: FileCodec<T>;
  data: T;
  private patches: Patch[][] = [];
  private revertPatches: Patch[][] = [];
  loadedData?: T;
  protected raw?: Buffer;
  options: O;
  changed?: boolean;
  get nodeType(): QdkNodeType {
    return 'file';
  }

  get relativePath(): string {
    return relativeToCwd(this.file.path, this.project.options.path);
  }

  static of<T, O extends QdkFileOptionsType = QdkFileOptionsType>(
    node: QdkNode,
    basename?: string,
  ): QdkFile<T, O> | undefined {
    if (!(node instanceof QdkFile)) return;
    if (basename && (node as QdkFile).options.basename !== basename) return;
    return node;
  }
  constructor(scope: Scope, options: O, codec: FileCodec<T>, initialData: T) {
    super(scope, options.basename);
    this.options = options;
    this.codec = codec;
    if (options.freeze) {
      this.data = freeze(initialData, true);
    } else {
      this.data = initialData;
    }
    this.file = createFile({
      path: join(options.cwd, options.basename),
    });
    if (this.options.readOnInit) {
      this.readSync({
        silentWhenMissing: true,
        updateData: this.options.sample,
      });
    }
    if (this.options.writeOnSynth) {
      this.addHooks({
        synth: async (options: SynthOptions) => {
          await this.write(options);
        },
      });
    }
  }

  async read(opts: { updateData?: boolean } = { updateData: false }) {
    return this.useHook(
      'read',
      [opts],
      async (opts: { updateData?: boolean } = { updateData: false }) => {
        this.debug('Reading file', this.relativePath);
        this.raw = await readFile(this.file.path);
        this.loadedData = this.codec.deserializer(this.raw);
        if (opts.updateData) {
          this.debug('Using loaded data');
          this.data = this.loadedData;
        }
      },
    );
  }

  readSync(
    opts: {
      updateData?: boolean;
      silentWhenMissing?: boolean;
      rawOnly?: boolean;
    } = {
      silentWhenMissing: false,
      updateData: false,
      rawOnly: false,
    },
  ) {
    if (opts.silentWhenMissing && !existsSync(this.file.path)) {
      this.debug('File', this.relativePath, 'do not exist');
      return;
    }
    this.debug('Reading (sync) file', this.relativePath);
    this.raw = readFileSync(this.file.path);
    if (!opts.rawOnly) {
      this.loadedData = this.codec.deserializer(this.raw);
      if (opts.updateData) {
        this.debug('Using loaded data');
        this.data = this.loadedData;
      }
    }
  }

  async write(options: SynthOptions = {}) {
    if (options.checkOnly && !this.raw) {
      this.readSync({ updateData: false, rawOnly: true });
    }
    const buffer = this.codec.serializer(this.data);
    this.changed = !this.raw || !buffer.equals(this.raw);
    if (this.changed) {
      this.debug('File has changed');
      if (options.checkOnly) {
        this.debug('Check only mode');
        const formatOnCheck = this.options.formatOnCheck;
        const data: Record<string, string | undefined> = {
          oldCode: undefined,
          newCode: undefined,
        };
        if (formatOnCheck && this.raw && buffer) {
          this.debug('Preparing to format old and new code');
          const prettierOptions = this.getPrettierOptions();
          this.debug('Prettier format options', prettierOptions);
          try {
            data.oldCode = await prettier.format(
              this.raw.toString(),
              prettierOptions,
            );
            data.newCode = await prettier.format(
              buffer.toString(),
              prettierOptions,
            );
            this.debug(
              'Compare both old and new code\n\nOLD:\n' +
                data.oldCode +
                '\n\nNEW:\n' +
                data.newCode,
            );
            if (data.oldCode === data.newCode) {
              return;
            }
          } catch (e) {
            this.debug('Ignoring format error', e);
          }
        }
        options.errorReporter.report(
          this,
          'file-changed',
          'File does not match!',
          { filename: this.file.path, data },
        );
        return;
      }
      await this.useHook(
        'write',
        [this.file, this.data, buffer],
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async (_file, _data, _buffer) => {
          this.raw = buffer;
          if (!this.loadedData) {
            const fileDirname = dirname(this.file.path);
            this.debug(
              'Create directory if needed',
              relativeToCwd(fileDirname),
            );
            await mkdir(fileDirname, { recursive: true });
          }
          this.debug('Writing file', this.relativePath);
          if (this.options.formatOnWrite) {
            try {
              await this.tryFormat();
            } catch (e) {
              this.debug('Ignoring format error', e);
            }
          }
          await writeFile(this.file.path, this.raw);
        },
      );
    } else {
      // console.log('didnt change', this);
      this.debug('Nothing changed');
    }
  }

  private getPrettierOptions(): prettier.Options {
    const defaultPrettierOptions = PrettierOptions.getOptions(
      {
        config: {
          ...(Prettier.for(this)?.options?.config ?? {}),
        },
        //plugins: ['prettier-plugin-organize-imports'],
      },
      { scope: this },
    );
    return typeof this.options.formatOnCheck === 'object'
      ? {
          ...(defaultPrettierOptions?.config ?? {}),
          ...this.options.formatOnCheck,
          filepath: this.file.path,
        }
      : {
          ...(defaultPrettierOptions?.config ?? {}),
          filepath: this.file.path,
        };
  }

  protected async tryFormat() {
    if (!this.raw) return;
    const fileInfo = await prettier.getFileInfo(this.file.path);
    if (fileInfo.inferredParser) {
      const prettierOptions = this.getPrettierOptions();
      const code = await prettier.format(this.raw.toString(), prettierOptions);
      this.raw = Buffer.from(code);
    }
  }

  update(mutate: (data: T) => T | void, record = true) {
    this.data = produce(this.data, mutate, (patches, revertPatches) => {
      this.debug('Apply patches:', patches);
      if (record) {
        this.patches.push(patches);
        this.revertPatches.push(revertPatches);
        // this.debug('Revert patches', revertPatches);
      }
    });
  }

  undo(): boolean {
    const patches = this.revertPatches.pop();
    if (patches) {
      this.debug('Undo patches', patches);
      this.update(data => {
        return applyPatches(data as Objectish, patches) as T;
      }, false);
      return true;
    }
    this.debug('Nothing to undo');
    return false;
  }
}
