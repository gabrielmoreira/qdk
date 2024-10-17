import {
  IniFile,
  IniFileInitialOptionsType,
  Iniifiable,
  JsonFile,
  JsonFileInitialOptionsType,
  Jsonifiable,
  QdkFileInitialOptionsType,
  QdkNode,
  Scope,
  TextFile,
  TextFileInitialOptionsType,
  YamlFile,
  YamlFileInitialOptionsType,
  Yamlifiable,
} from '../index.js';

export interface SampleFile<
  T extends string,
  O extends QdkFileInitialOptionsType,
  D,
> {
  type: T;
  options: Omit<O, 'basename'>;
  data: D;
}

export type SampleFileType =
  | SampleFile<'json', JsonFileInitialOptionsType, Jsonifiable>
  | SampleFile<'yaml', YamlFileInitialOptionsType, Yamlifiable>
  | SampleFile<'ini', IniFileInitialOptionsType, Iniifiable>
  | SampleFile<'text', TextFileInitialOptionsType, string>;

export interface SampleFilesOptions {
  files: Record<string, string | SampleFileType>;
}

export class SampleFiles extends QdkNode {
  constructor(scope: Scope, options: SampleFilesOptions) {
    super(scope, 'SampleFiles');
    Object.entries(options.files).forEach(([name, fileOpts]) => {
      const file =
        typeof fileOpts === 'string'
          ? {
              type: 'text',
              options: {
                sample: true,
              },
              data: fileOpts,
            }
          : fileOpts;

      switch (file.type) {
        case 'json':
          return new JsonFile(
            this,
            { ...file.options, basename: name, sample: true },
            file.data,
          );
        case 'yaml':
          return new YamlFile(
            this,
            { ...file.options, basename: name, sample: true },
            file.data,
          );
        case 'ini':
          return new IniFile(
            this,
            { ...file.options, basename: name, sample: true },
            file.data,
          );
        case 'text':
          return new TextFile(
            this,
            { ...file.options, basename: name, sample: true },
            file.data,
          );
      }
    });
  }
}
