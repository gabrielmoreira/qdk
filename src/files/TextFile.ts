import {
  FileCodec,
  QdkFile,
  QdkFileInitialOptions,
  QdkFileOptions,
  QdkNode,
  Scope,
} from '../index.js';

const createTextCodec = (): FileCodec<string> => ({
  serializer: (data: string) => Buffer.from(data),
  deserializer: buffer => buffer.toString('utf8'),
});

export type TextFileOptions = QdkFileOptions & {};
export type TextFileInitialOptions = QdkFileInitialOptions & {};

export class TextFile extends QdkFile<string, TextFileOptions> {
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
    options: TextFileInitialOptions,
    initialData: string,
  ) {
    super(scope, options, createTextCodec(), initialData);
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
