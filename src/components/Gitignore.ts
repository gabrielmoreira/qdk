import {
  Component,
  createOptions,
  gitignoreDefault,
  OptionsMerger,
  Scope,
  TextFile,
} from '../index.js';

export interface GitignoreOptionsType {
  pattern?: string[];
  mergeDefaults?: boolean;
}

export type GitignoreInitialOptionsType = Partial<GitignoreOptionsType>;

const GitignoreDefaults: Partial<GitignoreOptionsType> = {
  pattern: gitignoreDefault,
  mergeDefaults: true,
};

const optionsMerger: OptionsMerger<
  GitignoreOptionsType,
  GitignoreInitialOptionsType,
  typeof GitignoreDefaults
> = (initialOptions, defaults) => ({
  ...defaults,
  ...initialOptions,
  pattern:
    (initialOptions.mergeDefaults ?? defaults.mergeDefaults)
      ? [...(defaults.pattern ?? []), ...(initialOptions.pattern ?? [])]
      : [...(initialOptions.pattern ?? [])],
});

export const GitignoreOptions = createOptions(
  'GitignoreOptions',
  GitignoreDefaults,
  optionsMerger,
);

export class Gitignore extends Component<GitignoreOptionsType> {
  private readonly ignored: string[] = [];
  readonly file: TextFile;
  constructor(scope: Scope, options: GitignoreInitialOptionsType = {}) {
    super(scope, GitignoreOptions.getOptions(options, { scope }));
    this.file = new TextFile(this, { basename: '.gitignore' }, '');
    if (this.options.pattern?.length) this.add(...this.options.pattern);
    this.hook('synth:before', () => {
      this.file.update(() => this.ignored.join('\n'));
    });
  }
  add(...pattern: string[]): this {
    this.ignored.push(...pattern);
    return this;
  }
}
