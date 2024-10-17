import {
  generateCode,
  GenerateOptions,
  parseModule,
  ProxifiedModule,
} from 'magicast';
import { basename } from 'path';
import {
  createOptionsManager,
  FileCodec,
  OptionsMerger,
  QdkFile,
  QdkFileInitialOptionsType,
  QdkFileOptions,
  QdkFileOptionsType,
  QdkNode,
  Scope,
} from '../index.js';

export type SourceCodeFileOptionsType = QdkFileOptionsType & {
  generateOptions: GenerateOptions;
  parserOptions: ParserOptions;
};
export type SourceCodeFileInitialOptionsType = Exclude<
  Partial<SourceCodeFileOptionsType>,
  keyof QdkFileOptionsType
> &
  QdkFileInitialOptionsType;

const SourceCodeFileDefaults = {
  generateOptions: {},
  parserOptions: {},
} satisfies Partial<SourceCodeFileOptionsType>;

const optionsMerger: OptionsMerger<
  SourceCodeFileOptionsType,
  SourceCodeFileInitialOptionsType,
  typeof SourceCodeFileDefaults
> = (initialOptions, defaults, context) => {
  const fileOptions = QdkFileOptions.getOptions(
    {
      ...defaults,
      ...initialOptions,
    },
    context,
  );
  return {
    ...defaults,
    ...fileOptions,
    generateOptions: {
      ...defaults.generateOptions,
      ...initialOptions.generateOptions,
    },
    parserOptions: {
      ...defaults.parserOptions,
      ...initialOptions.parserOptions,
    },
    freeze: false,
  };
};

export const SourceCodeFileOptions = createOptionsManager(
  Symbol.for('SourceCodeFileOptions'),
  SourceCodeFileDefaults,
  optionsMerger,
);

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
    encode: data => {
      const ast = '$ast' in data ? data.$ast : data;
      const { code } = generateCode(ast, generateOptions);
      return Buffer.from(code);
    },
    decode: buffer => {
      return parseModule(buffer.toString('utf8'), parserOptions);
    },
  };
}
/**
 * @deprecated This code is experimental
 */
export class SourceCodeFile extends QdkFile<
  SourceCode,
  SourceCodeFileOptionsType
> {
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
  constructor(
    scope: Scope,
    options: SourceCodeFileInitialOptionsType,
    initialData: string,
  ) {
    const opts = SourceCodeFileOptions.getOptions(options, { scope });
    const _codec = createSourceCodeParserCodec({
      sourceFileName: basename(opts.basename),
      generateOptions: opts.generateOptions,
      parserOptions: opts.parserOptions,
    });
    super(scope, opts, _codec.decode(Buffer.from(initialData)));
  }
  protected createCodec(): FileCodec<SourceCode> {
    return createSourceCodeParserCodec({
      sourceFileName: basename(this.options.basename),
      generateOptions: this.options.generateOptions,
      parserOptions: this.options.parserOptions,
    });
  }
  update(mutate: (data: ProxifiedModule<object>) => void): void {
    mutate(this.data);
  }
}
