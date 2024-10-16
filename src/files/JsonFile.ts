/* eslint-disable @typescript-eslint/no-explicit-any */
import { get, merge, set } from 'lodash-es';
import type { Jsonifiable } from 'type-fest';
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

export { Jsonifiable };

export type JsonFileOptionsType = QdkFileOptionsType & {};
export type JsonFileInitialOptionsType = QdkFileInitialOptionsType & {};
const JsonFileDefaults = {} satisfies Partial<JsonFileOptionsType>;

const optionsMerger: OptionsMerger<
  JsonFileOptionsType,
  JsonFileInitialOptionsType,
  typeof JsonFileDefaults
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

export const JsonFileOptions = createOptionsManager(
  Symbol.for('JsonFileOptions'),
  JsonFileDefaults,
  optionsMerger,
);

export const createJsonCodec = <T = Jsonifiable>(): FileCodec<T> => ({
  serializer: (data: T) => Buffer.from(JSON.stringify(data, null, 2)),
  deserializer: buffer => JSON.parse(buffer.toString('utf8')) as T,
});

export class JsonFile<T = Jsonifiable> extends QdkFile<T, JsonFileOptionsType> {
  static ofJson(node: QdkNode, path: string): JsonFile | undefined {
    return node instanceof JsonFile
      ? (QdkFile.of(node, path) as JsonFile | undefined)
      : undefined;
  }
  static ofPath(path: string) {
    return (node: QdkNode): JsonFile | undefined => {
      return JsonFile.ofJson(node, path);
    };
  }
  static forPath(scope: Scope, path: string): JsonFile | undefined {
    return scope.project.findComponent(JsonFile.ofPath(path));
  }
  constructor(
    scope: Scope,
    options: JsonFileInitialOptionsType,
    initialData: T,
  ) {
    super(
      scope,
      JsonFileOptions.getOptions(options, { scope }),
      createJsonCodec(),
      initialData,
    );
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
