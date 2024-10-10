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
import {
  createFile,
  existsSync,
  FsFile,
  mkdir,
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

export interface QdkFileOptions {
  cwd: string;
  basename: string;
  readOnInit?: boolean;
  sample?: boolean;
  writeOnSynth?: boolean;
  freeze?: boolean;
}
export type QdkFileInitialOptions = Partial<QdkFileOptions> &
  Pick<QdkFileOptions, 'basename'>;

export interface FileCodec<T = any> {
  serializer: (data: T) => Buffer;
  deserializer: (buffer: Buffer) => T;
}
export class QdkFile<
  T = any,
  O extends QdkFileOptions = QdkFileOptions,
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

  static of<T, O extends QdkFileOptions = QdkFileOptions>(
    node: QdkNode,
    basename?: string,
  ): QdkFile<T, O> | undefined {
    if (!(node instanceof QdkFile)) return;
    if (basename && (node as QdkFile).options.basename !== basename) return;
    return node;
  }
  static defaults(
    options: QdkFileInitialOptions,
    scope: Scope,
  ): QdkFileOptions {
    return {
      ...options,
      cwd:
        options.cwd ??
        join(scope.project.options.cwd, scope.project.options.outdir),
    };
  }
  constructor(
    scope: Scope,
    options: QdkFileInitialOptions,
    codec: FileCodec<T>,
    initialData: T,
  ) {
    const opts = QdkFile.defaults(options, scope);
    super(scope, opts.basename);
    this.options = opts as O;
    this.codec = codec;
    if (opts.freeze ?? true) {
      this.data = freeze(initialData, true);
    } else {
      this.data = initialData;
    }
    this.file = createFile({
      path: join(opts.cwd, opts.basename),
    });
    if (this.options.readOnInit ?? true) {
      this.readSync({
        silentWhenMissing: true,
        updateData: this.options.sample ?? false,
      });
    }
    if (this.options.writeOnSynth ?? true) {
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
      if (options.checkOnly) {
        options.errorReporter.report(
          this,
          'file-changed',
          'File does not match!',
          { filename: this.file.path },
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
          await writeFile(this.file.path, this.raw);
        },
      );
    } else {
      // console.log('didnt change', this);
      this.debug('Nothing changed');
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
