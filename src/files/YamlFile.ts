/* eslint-disable @typescript-eslint/no-explicit-any */
import { get, merge, set } from 'lodash-es';
import type { Jsonifiable } from 'type-fest';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import {
  createOptions,
  FileCodec,
  OptionsMerger,
  QdkFile,
  QdkFileInitialOptionsType,
  QdkFileOptions,
  QdkFileOptionsType,
  QdkNode,
  Scope,
} from '../index.js';

export type YamlFileOptionsType = QdkFileOptionsType & {};
export type YamlFileInitialOptionsType = QdkFileInitialOptionsType & {};
export type Yamlifiable = Jsonifiable;

const YamlFileDefaults = {} satisfies Partial<YamlFileOptionsType>;

const optionsMerger: OptionsMerger<
  YamlFileOptionsType,
  YamlFileInitialOptionsType,
  typeof YamlFileDefaults
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

export const YamlFileOptions = createOptions(
  'YamlFileOptions',
  YamlFileDefaults,
  optionsMerger,
);

const createYamlCodec = <T = Yamlifiable>(): FileCodec<T> => ({
  encode: (data: T) => Buffer.from(stringifyYaml(data, null, 2)),
  decode: buffer => parseYaml(buffer.toString('utf8')) as T,
});

export class YamlFile<T extends Yamlifiable = Yamlifiable> extends QdkFile<
  T,
  YamlFileOptionsType
> {
  static ofYaml(node: QdkNode, path: string): YamlFile | undefined {
    return node instanceof YamlFile
      ? (QdkFile.of(node, path) as YamlFile | undefined)
      : undefined;
  }
  static ofPath(path: string) {
    return (node: QdkNode): YamlFile | undefined => {
      return YamlFile.ofYaml(node, path);
    };
  }
  static forPath(scope: Scope, path: string): YamlFile | undefined {
    return scope.project.findComponent(YamlFile.ofPath(path));
  }

  constructor(
    scope: Scope,
    options: YamlFileInitialOptionsType,
    initialData: T,
  ) {
    super(scope, YamlFileOptions.getOptions(options, { scope }), initialData);
  }

  protected createCodec(): FileCodec<T> {
    return createYamlCodec();
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
