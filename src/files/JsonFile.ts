/* eslint-disable @typescript-eslint/no-explicit-any */
import { get, merge, set } from 'lodash-es';
import type { Jsonifiable } from 'type-fest';
import {
  FileCodec,
  QdkFile,
  QdkFileInitialOptions,
  QdkFileOptions,
  QdkNode,
  Scope,
} from '../index.js';

export { Jsonifiable };

export type JsonFileOptions = QdkFileOptions & {};
export type JsonFileInitialOptions = QdkFileInitialOptions & {};

const createJsonCodec = <T = Jsonifiable>(): FileCodec<T> => ({
  serializer: (data: T) => Buffer.from(JSON.stringify(data, null, 2)),
  deserializer: buffer => JSON.parse(buffer.toString('utf8')) as T,
});

export class JsonFile<T = Jsonifiable> extends QdkFile<T, JsonFileOptions> {
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
  constructor(scope: Scope, options: JsonFileInitialOptions, initialData: T) {
    super(scope, options, createJsonCodec(), initialData);
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
