/* eslint-disable @typescript-eslint/no-explicit-any */
import { get, merge, set } from 'lodash-es';
import type { Jsonifiable } from 'type-fest';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import {
  FileCodec,
  QdkFile,
  QdkFileInitialOptions,
  QdkFileOptions,
  Scope,
} from '../index.js';

export type YamlFileOptions = QdkFileOptions & {};
export type YamlFileInitialOptions = QdkFileInitialOptions & {};
export type Yamlifiable = Jsonifiable;

const createYamlCodec = <T = Yamlifiable>(): FileCodec<T> => ({
  serializer: (data: T) => Buffer.from(stringifyYaml(data, null, 2)),
  deserializer: buffer => parseYaml(buffer.toString('utf8')) as T,
});

export class YamlFile<T extends Yamlifiable = Yamlifiable> extends QdkFile<
  T,
  YamlFileOptions
> {
  constructor(scope: Scope, options: YamlFileInitialOptions, initialData: T) {
    super(scope, options, createYamlCodec(), initialData);
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
        try {
          return merge(data, newValue) as T;
        } finally {
          this.debug('merge with', newValue);
        }
      });
    });
  }
}
