/* eslint-disable @typescript-eslint/no-explicit-any */
import { get, merge, set } from 'lodash-es';
import { parse, stringify } from 'smol-toml';
import {
  createOptions,
  FileCodec,
  JsonifiableObject,
  OptionsMerger,
  QdkFile,
  QdkFileInitialOptionsType,
  QdkFileOptions,
  QdkFileOptionsType,
  QdkNode,
  Scope,
} from '../index.mjs';

export type Tomlifiable = JsonifiableObject;

type TomlFileBaseOptionsType = object;
export type TomlFileOptionsType = QdkFileOptionsType & TomlFileBaseOptionsType;
export type TomlFileInitialOptionsType = QdkFileInitialOptionsType &
  TomlFileBaseOptionsType;
const TomlFileDefaults = {} satisfies Partial<TomlFileOptionsType>;

const optionsMerger: OptionsMerger<
  TomlFileOptionsType,
  TomlFileInitialOptionsType,
  typeof TomlFileDefaults
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

export const TomlFileOptions = createOptions(
  'TomlFileOptions',
  TomlFileDefaults,
  optionsMerger,
);

export const createTomlCodec = <T = Tomlifiable,>(): FileCodec<T> => ({
  encode: (data: T) => Buffer.from(stringify(data)),
  decode: buffer => parse(buffer.toString('utf8')) as T,
});

export class TomlFile<T = Tomlifiable> extends QdkFile<T, TomlFileOptionsType> {
  static ofToml(node: QdkNode, path: string): TomlFile | undefined {
    return node instanceof TomlFile
      ? (QdkFile.of(node, path) as TomlFile | undefined)
      : undefined;
  }
  static ofPath(path: string) {
    return (node: QdkNode): TomlFile | undefined => {
      return TomlFile.ofToml(node, path);
    };
  }
  static forPath(scope: Scope, path: string): TomlFile | undefined {
    return scope.project.findComponent(TomlFile.ofPath(path));
  }
  constructor(
    scope: Scope,
    options: TomlFileInitialOptionsType,
    initialData: T,
  ) {
    super(scope, TomlFileOptions.getOptions(options, { scope }), initialData);
  }
  protected createCodec(): FileCodec<T> {
    return createTomlCodec();
  }
  mergeField(property: string, newValue: T, defaultValue: any = {}) {
    this.update(data => {
      const currentValue: unknown = get(data, property);
      this.useSyncHook(
        'mergeField',
        [property, newValue, currentValue],
        (property, newValue, currentValue) => {
          set(
            data as object,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            property,
            merge(defaultValue, currentValue, newValue),
          );
          this.debug(`merge field[${property}] with`, newValue);
        },
      );
    });
  }

  merge(newValue: T) {
    this.update(data => {
      this.useSyncHook('merge', [newValue, data], (newValue, data) => {
        merge(data, newValue);
        this.debug(`merge with`, newValue);
      });
    });
  }
}
