import { HookCallback } from 'hookable';
import type { Jsonifiable } from 'type-fest';
import {
  AnyString,
  EsLintSourceFileDefaultTemplate,
  FileCodec,
  QdkFile,
  QdkFileInitialOptionsType,
  QdkFileOptions,
  QdkFileOptionsType,
  QdkNode,
  Scope,
} from '../index.mjs';

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
  tag: SourceFileTemplateLocation;
  condition?: string | ((params: T, filesdata: TemplateFileData<T>) => boolean);
  template:
    | string
    | ((params: T, data: TemplateFileData<T>) => string | undefined | false);
  hooks?: (scope: Scope) => Partial<Record<string, HookCallback>>;
  onBeforeSynth?: (scope: Scope) => unknown;
  onAfterSynth?: (scope: Scope) => unknown;
}
export interface SourceFileTemplate<T extends TemplateParams> {
  tags: SourceFileTemplateLocation[];
  blocks: SourceFileTemplateLine<T>[];
}

export interface TemplateFileData<T extends TemplateParams> {
  params: T;
  template: SourceFileTemplate<T>;
}

export type TemplateFileOptionsType<T extends TemplateParams> =
  QdkFileOptionsType & {
    template: SourceFileTemplate<T>;
  };

export type TemplateFileInitialOptionsType<T extends TemplateParams> =
  QdkFileInitialOptionsType &
    Omit<TemplateFileOptionsType<T>, keyof QdkFileOptionsType>;

export interface TemplateFileCodecContext<T extends TemplateParams> {
  onLineAdded: (line: SourceFileTemplateLine<T>) => void;
}

const createTemplateFileCodec = <T extends TemplateParams>(
  context: TemplateFileCodecContext<T>,
): FileCodec<TemplateFileData<T>> => ({
  encode: data => {
    const output: string[] = [];
    const { tags, blocks } = data.template;
    const { params } = data;
    tags.forEach(location => {
      blocks.forEach(line => {
        if (line.tag !== location) return;
        const shouldInclude =
          typeof line.condition === 'function'
            ? line.condition(params, data)
            : typeof line.condition === 'string'
              ? typeof params[line.condition] === 'undefined'
                ? true
                : !!params[line.condition]
              : line.condition;
        if (shouldInclude ?? true) {
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
  decode: (): TemplateFileData<T> => {
    throw new Error('Cannot deserialize a template file');
  },
});

/**
 * @deprecated This code is experimental
 */
export class TemplateFile<
  T extends TemplateParams = TemplateParams,
> extends QdkFile<TemplateFileData<T>, TemplateFileOptionsType<T>> {
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
    options: TemplateFileInitialOptionsType<T>,
    scope: Scope,
  ): TemplateFileOptionsType<T> {
    const opts = QdkFileOptions.getOptions(options, { scope });
    return {
      ...options,
      ...opts,
      template:
        options.template ?? (EsLintSourceFileDefaultTemplate as unknown as T),
    };
  }
  private addedHooks: Record<string, HookCallback | undefined>[] = [];
  constructor(
    scope: Scope,
    options: TemplateFileInitialOptionsType<T>,
    initialData: TemplateFileData<T>,
  ) {
    super(scope, TemplateFile.defaults(options, scope), initialData);
    ['synth:before', 'synth:after'].forEach(hookKey => {
      this.hook(hookKey, async (...args: unknown[]) => {
        await Promise.all(
          this.addedHooks.map(hooks => {
            const hook = hooks[hookKey];
            if (hook) return hook(...args);
          }),
        );
      });
    });
  }
  protected createCodec(): FileCodec<TemplateFileData<T>> {
    if (this.codec) return this.codec;
    const codec = createTemplateFileCodec<T>({
      onLineAdded: line => line.hooks && this.addedHooks.push(line.hooks(this)),
    });
    return codec;
  }
}
