/* eslint-disable @typescript-eslint/no-explicit-any */
import { parse, stringify } from 'ini';
import { get, merge, set } from 'lodash-es';
import {
  createOptionsManager,
  FileCodec,
  JsonifiableObject,
  OptionsMerger,
  QdkFile,
  QdkFileInitialOptionsType,
  QdkFileOptions,
  QdkFileOptionsType,
  QdkNode,
  Scope,
} from '../index.js';

export type Iniifiable = JsonifiableObject;

export type IniFileOptionsType = QdkFileOptionsType & {};
export type IniFileInitialOptionsType = QdkFileInitialOptionsType & {};
const IniFileDefaults = {} satisfies Partial<IniFileOptionsType>;

const optionsMerger: OptionsMerger<
  IniFileOptionsType,
  IniFileInitialOptionsType,
  typeof IniFileDefaults
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

export const IniFileOptions = createOptionsManager(
  Symbol.for('IniFileOptions'),
  IniFileDefaults,
  optionsMerger,
);

export const createIniCodec = <T = Iniifiable>(): FileCodec<T> => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
  encode: (data: T) => Buffer.from(stringify(data)),

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  decode: buffer => parse(buffer.toString('utf8')) as T,
});

export class IniFile<T = Iniifiable> extends QdkFile<T, IniFileOptionsType> {
  static ofIni(node: QdkNode, path: string): IniFile | undefined {
    return node instanceof IniFile
      ? (QdkFile.of(node, path) as IniFile | undefined)
      : undefined;
  }
  static ofPath(path: string) {
    return (node: QdkNode): IniFile | undefined => {
      return IniFile.ofIni(node, path);
    };
  }
  static forPath(scope: Scope, path: string): IniFile | undefined {
    return scope.project.findComponent(IniFile.ofPath(path));
  }
  constructor(
    scope: Scope,
    options: IniFileInitialOptionsType,
    initialData: T,
  ) {
    super(scope, IniFileOptions.getOptions(options, { scope }), initialData);
  }
  protected createCodec(): FileCodec<T> {
    return createIniCodec();
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
