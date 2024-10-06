import {
  generateCode,
  GenerateOptions,
  parseModule,
  ProxifiedModule,
} from 'magicast';
import { basename } from 'path';
import {
  FileCodec,
  QdkFile,
  QdkFileInitialOptions,
  QdkFileOptions,
  QdkNode,
  Scope,
} from '../index.js';

export type SourceCodeFileOptions = QdkFileOptions & {
  generateOptions: GenerateOptions;
  parserOptions: ParserOptions;
};
export type SourceCodeFileInitialOptions = Exclude<
  Partial<SourceCodeFileOptions>,
  keyof QdkFileOptions
> &
  QdkFileInitialOptions;

// Magicast do not re-export the ParserOptions type.
export type ParserOptions = Exclude<
  Parameters<typeof parseModule>[1],
  undefined
>;
export type SourceCode = ReturnType<typeof parseModule>;

export interface SourceCodeParserCodecOptions {
  sourceFileName: string;
  generateOptions: GenerateOptions;
  parserOptions: ParserOptions;
}
export function createSourceCodeParserCodec({
  sourceFileName,
  generateOptions,
  parserOptions,
}: SourceCodeParserCodecOptions): FileCodec<SourceCode> {
  parserOptions.sourceFileName = sourceFileName;
  return {
    serializer: data => {
      const ast = '$ast' in data ? data.$ast : data;
      const { code } = generateCode(ast, generateOptions);
      return Buffer.from(code);
    },
    deserializer: buffer => {
      return parseModule(buffer.toString('utf8'), parserOptions);
    },
  };
}
export class SourceCodeFile extends QdkFile<SourceCode, SourceCodeFileOptions> {
  static ofText(node: QdkNode, path: string): SourceCodeFile | undefined {
    return node instanceof SourceCodeFile
      ? (QdkFile.of(node, path) as SourceCodeFile | undefined)
      : undefined;
  }
  static ofPath(path: string) {
    return (node: QdkNode): SourceCodeFile | undefined => {
      return SourceCodeFile.ofText(node, path);
    };
  }
  static forPath(scope: Scope, path: string): SourceCodeFile | undefined {
    return scope.project.findComponent(SourceCodeFile.ofPath(path));
  }
  static defaults(
    options: SourceCodeFileInitialOptions,
    scope: Scope,
  ): SourceCodeFileOptions {
    const opts = QdkFile.defaults(options, scope);
    return {
      ...opts,
      generateOptions: options.generateOptions ?? {},
      parserOptions: options.parserOptions ?? {},
      freeze: false,
    };
  }
  constructor(
    scope: Scope,
    options: SourceCodeFileInitialOptions,
    initialData: string,
  ) {
    const opts = SourceCodeFile.defaults(options, scope);
    const codec = createSourceCodeParserCodec({
      sourceFileName: basename(opts.basename),
      generateOptions: opts.generateOptions,
      parserOptions: opts.parserOptions,
    });
    opts.freeze = false;
    super(scope, opts, codec, codec.deserializer(Buffer.from(initialData)));
  }
  update(mutate: (data: ProxifiedModule<object>) => void): void {
    mutate(this.data);
  }
}
