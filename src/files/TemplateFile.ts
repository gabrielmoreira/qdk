import { HookCallback } from 'hookable';
import type { Jsonifiable } from 'type-fest';
import {
  AnyString,
  EsLintSourceFileDefaultTemplate,
  FileCodec,
  QdkFile,
  QdkFileInitialOptions,
  QdkFileOptions,
  QdkNode,
  Scope,
} from '../index.js';

export type TemplateParams = Record<string, Jsonifiable>;

export type SourceFileTemplateLocation =
  | 'file_start'
  | 'imports_start'
  | 'imports'
  | 'imports_end'
  | 'code_start'
  | 'code'
  | 'code_end'
  | 'exports_start'
  | 'exports'
  | 'exports_end'
  | 'file_end'
  | AnyString;
export interface SourceFileTemplateLine<T extends TemplateParams> {
  location: SourceFileTemplateLocation;
  requires?: string | ((params: T, filesdata: TemplateFileData<T>) => boolean);
  template:
    | string
    | ((params: T, data: TemplateFileData<T>) => string | undefined | false);
  hooks?: (scope: Scope) => {
    [event in string]?: HookCallback;
  };
  onBeforeSynth?: (scope: Scope) => unknown;
  onAfterSynth?: (scope: Scope) => unknown;
}
export interface SourceFileTemplate<T extends TemplateParams> {
  locations: SourceFileTemplateLocation[];
  lines: SourceFileTemplateLine<T>[];
}

export interface TemplateFileData<T extends TemplateParams> {
  params: T;
  template: SourceFileTemplate<T>;
}

export type TemplateFileOptions<T extends TemplateParams> = QdkFileOptions & {
  template: SourceFileTemplate<T>;
};

export type TemplateFileInitialOptions<T extends TemplateParams> =
  QdkFileInitialOptions & Omit<TemplateFileOptions<T>, keyof QdkFileOptions>;

export interface TemplateFileCodecContext<T extends TemplateParams> {
  onLineAdded: (line: SourceFileTemplateLine<T>) => void;
}
const createTemplateFileCodec = <T extends TemplateParams>(
  context: TemplateFileCodecContext<T>,
): FileCodec<TemplateFileData<T>> => ({
  serializer: data => {
    const output: string[] = [];
    const { locations, lines } = data.template;
    const { params } = data;
    locations.forEach(location => {
      lines.forEach(line => {
        if (line.location !== location) return;
        const requires =
          typeof line.requires === 'function'
            ? line.requires(params, data)
            : typeof line.requires === 'string'
              ? typeof params[line.requires] === 'undefined'
                ? true
                : !!params[line.requires]
              : line.requires;
        if (requires ?? true) {
          const compiledLine =
            typeof line.template === 'function'
              ? line.template(params, data)
              : line.template;
          if (compiledLine) {
            output.push(compiledLine);
            context.onLineAdded(line);
          }
        }
      });
    });

    return Buffer.from(output.join('\n'));
  },
  deserializer: (): TemplateFileData<T> => {
    throw new Error('Cannot deserialize a template file');
  },
});
export class TemplateFile<
  T extends TemplateParams = TemplateParams,
> extends QdkFile<TemplateFileData<T>, TemplateFileOptions<T>> {
  static ofTemplate(node: QdkNode, path: string): TemplateFile | undefined {
    return node instanceof TemplateFile
      ? (QdkFile.of(node, path) as TemplateFile | undefined)
      : undefined;
  }
  static ofPath(path: string) {
    return (node: QdkNode): TemplateFile | undefined => {
      return TemplateFile.ofTemplate(node, path);
    };
  }
  static forPath(scope: Scope, path: string): TemplateFile | undefined {
    return scope.project.findComponent(TemplateFile.ofPath(path));
  }
  static defaults<T extends TemplateParams>(
    options: TemplateFileInitialOptions<T>,
    scope: Scope,
  ): TemplateFileOptions<T> {
    const opts = QdkFile.defaults(options, scope);
    return {
      template:
        options.template ?? (EsLintSourceFileDefaultTemplate as unknown as T),
      ...opts,
    };
  }
  constructor(
    scope: Scope,
    options: TemplateFileInitialOptions<T>,
    initialData: TemplateFileData<T>,
  ) {
    const addedHooks: Record<string, HookCallback | undefined>[] = [];
    let _this: TemplateFile<T> | null = null;
    const codec = createTemplateFileCodec<T>({
      onLineAdded: line =>
        line.hooks && addedHooks.push(line.hooks(_this ?? scope)),
    });
    super(scope, options, codec, initialData);
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    _this = this;
    ['synth:before', 'synth:after'].forEach(hookKey => {
      this.hook(hookKey, async (...args) => {
        await Promise.all(
          addedHooks.map(hooks => {
            const hook = hooks[hookKey];
            if (hook) return hook(args);
          }),
        );
      });
    });
  }
}
