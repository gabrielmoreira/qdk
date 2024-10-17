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

export type TextFileOptionsType = QdkFileOptionsType & {};
export type TextFileInitialOptionsType = QdkFileInitialOptionsType & {};
const TextFileDefaults = {} satisfies Partial<TextFileOptionsType>;

const optionsMerger: OptionsMerger<
  TextFileOptionsType,
  TextFileInitialOptionsType,
  typeof TextFileDefaults
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
  };
};

export const TextFileOptions = createOptionsManager(
  Symbol.for('TextFileOptions'),
  TextFileDefaults,
  optionsMerger,
);

const createTextCodec = (): FileCodec<string> => ({
  encode: (data: string) => Buffer.from(data),
  decode: buffer => buffer.toString('utf8'),
});

export class TextFile extends QdkFile<string, TextFileOptionsType> {
  static ofText(node: QdkNode, path: string): TextFile | undefined {
    return node instanceof TextFile
      ? (QdkFile.of(node, path) as TextFile | undefined)
      : undefined;
  }
  static ofPath(path: string) {
    return (node: QdkNode): TextFile | undefined => {
      return TextFile.ofText(node, path);
    };
  }
  static forPath(scope: Scope, path: string): TextFile | undefined {
    return scope.project.findComponent(TextFile.ofPath(path));
  }
  constructor(
    scope: Scope,
    options: TextFileInitialOptionsType,
    initialData: string,
  ) {
    super(scope, TextFileOptions.getOptions(options, { scope }), initialData);
  }

  protected createCodec(): FileCodec<string> {
    return createTextCodec();
  }

  change(newValue: string) {
    this.update(() => {
      return this.useSyncHook('set', [newValue], newValue => {
        try {
          return newValue as string;
        } finally {
          this.debug(`set`, newValue);
        }
      });
    });
  }
}
