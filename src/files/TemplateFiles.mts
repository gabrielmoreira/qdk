import { Eta } from 'eta';
import {
  Component,
  createOptions,
  OptionsMerger,
  readFileSync,
  Scope,
  SynthOptions,
  TextFile,
} from '../index.mjs';
import { loadTemplates } from './utils/loadTemplates.mjs';

interface Template {
  name: string;
  outputFileName?: string;
  sample?: boolean;
}

export interface TemplateFilesOptionsType<Data extends object> {
  engine: TemplateEngine;
  templatePath: string;
  templates?: Template[];
  sample?: boolean;
  includeFile?: (
    file: Template,
    data: Data,
    templates: TemplateFiles<Data>,
  ) => boolean;
}

export type TemplateFilesInitialOptionsType<Data extends object> = Partial<
  Omit<TemplateFilesOptionsType<Data>, 'engine'>
> & {
  templatePath: string;
  engine?: TemplateEngine | 'eta';
};

const TemplateFilesDefaults = {
  engine: 'eta',
  sample: false,
} satisfies Partial<TemplateFilesInitialOptionsType<object>>;

const optionsMerger: OptionsMerger<
  TemplateFilesOptionsType<object>,
  TemplateFilesInitialOptionsType<object>,
  typeof TemplateFilesDefaults
> = (initialOptions, defaults) => {
  const base = {
    ...defaults,
    ...initialOptions,
  };
  return {
    templatePath: base.templatePath,
    engine: base.engine === 'eta' ? new EtaTemplateEngine(base) : base.engine,
    includeFile: base.includeFile,
    sample: base.sample,
    templates: base.templates,
  };
};

export const TemplateFilesOptions = createOptions(
  'TemplateFilesOptions',
  TemplateFilesDefaults,
  optionsMerger,
);

export class TemplateFiles<Data extends object> extends Component<
  TemplateFilesOptionsType<Data>
> {
  data: Data;
  private readonly engine: TemplateEngine;

  constructor(
    scope: Scope,
    options: TemplateFilesInitialOptionsType<Data>,
    data: Data,
  ) {
    super(
      scope,
      TemplateFilesOptions.getOptions(
        options as TemplateFilesInitialOptionsType<object>,
        { scope },
      ) as unknown as TemplateFilesOptionsType<Data>,
    );
    this.data = data;
    this.hook('synth', this.onSynth.bind(this));
    this.engine = this.options.engine;
    if (!this.options.templates) {
      this.options.templates = loadTemplates(this.options);
    }
  }

  async onSynth(options: SynthOptions) {
    if (this.options.templates) {
      await Promise.all(
        this.options.templates.map(template =>
          this.synthTemplate(template, options),
        ),
      );
    }
  }

  protected async synthTemplate(
    template: Template,
    options: SynthOptions,
  ): Promise<void> {
    const includeFile =
      this.options?.includeFile?.(template, this.data, this) ?? true;
    if (includeFile) {
      const content = await this.engine.render(template, this);
      if (!options.checkOnly) {
        const sample = template.sample ?? this.options?.sample ?? false;
        let outputFilename =
          template.outputFileName ??
          this.engine.getTemplateNameWithoutExtension(template.name);
        if (this.engine.hasTemplate(outputFilename)) {
          outputFilename = await this.engine.renderString(outputFilename, this);
        }
        await new TextFile(
          this,
          {
            basename: outputFilename,
            sample,
          },
          content,
        ).synth(options);
      }
    }
  }
}

export interface TemplateEngine {
  normalizeTemplateName(name: string): string;
  hasTemplate(value: string): boolean;
  getTemplateNameWithoutExtension(name: string): string;
  render<Data extends object>(
    template: Template,
    context: TemplateContext<Data>,
  ): Promise<string>;
  renderString<Data extends object>(
    template: string,
    context: TemplateContext<Data>,
  ): Promise<string>;
}

export interface TemplateContext<Data extends object> {
  data: Data;
}

export interface TemplateEngineOptions {
  templatePath: string;
}

class CustomEta extends Eta {
  readFile: typeof Eta.prototype.readFile = path => {
    return readFileSync(path).toString();
  };
}

export class EtaTemplateEngine implements TemplateEngine {
  private readonly eta: CustomEta;
  constructor(options: TemplateEngineOptions) {
    this.eta = new CustomEta({
      views: options.templatePath,
      autoEscape: false,
    });
  }

  hasTemplate(value: string) {
    return value.includes('<%=');
  }

  getTemplateNameWithoutExtension(name: string): string {
    return name.replaceAll(/\.eta$/g, '');
  }
  normalizeTemplateName(name: string): string {
    return name.endsWith('.eta') ? name : `${name}.eta`;
  }
  render<Data extends object>(
    template: Template,
    context: TemplateContext<Data>,
  ): Promise<string> {
    return this.eta.renderAsync(this.normalizeTemplateName(template.name), {
      ...context.data,
      ctx: context,
    });
  }

  renderString<Data extends object>(
    template: string,
    context: TemplateContext<Data>,
  ): Promise<string> {
    return this.eta.renderStringAsync(template, {
      ...context.data,
      ctx: context,
    });
  }
}
