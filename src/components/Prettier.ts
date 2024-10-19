import * as prettier from 'prettier';
import {
  Component,
  createOptions,
  JsonFile,
  OptionsMerger,
  PackageJson,
  PackageJsonOptions,
  QdkNode,
  Scope,
} from '../index.js';
export interface PrettierOptionsType {
  configFilename: string;
  version: string;
  features: {
    autoOrganizeImports: boolean;
  };
  config: prettier.Options;
  defaultScripts: Record<string, string | undefined>;
}

export type PrettierInitialOptions = Partial<PrettierOptionsType>;

const PrettierDefaults = {
  configFilename: '.prettierrc',
  version: '^3.0.0',
  features: {
    autoOrganizeImports: true,
  },
  config: {
    arrowParens: 'avoid',
    singleQuote: true,
    overrides: [],
    plugins: [],
  },
  defaultScripts: {
    format: 'prettier . --write',
  },
} satisfies PrettierOptionsType;

PackageJsonOptions.setDefaultVersions({
  prettier: '^3.0.0',
  'prettier-plugin-organize-imports': '^4.1.0',
});

const optionsMerger: OptionsMerger<
  PrettierOptionsType,
  PrettierInitialOptions,
  typeof PrettierDefaults
> = (initialOptions, defaults) => {
  return {
    ...defaults,
    ...initialOptions,
    features: {
      ...defaults.features,
      ...initialOptions.features,
    },
    config: {
      ...defaults.config,
      ...initialOptions?.config,
    },
    defaultScripts: {
      ...defaults.defaultScripts,
      ...initialOptions.defaultScripts,
    },
  };
};

export const PrettierOptions = createOptions(
  'PrettierOptions',
  PrettierDefaults,
  optionsMerger,
);

export class Prettier extends Component<PrettierOptionsType> {
  static of(this: void, node: QdkNode): Prettier | undefined {
    return node instanceof Prettier ? node : undefined;
  }
  static for(this: void, scope: Scope): Prettier | undefined {
    return scope.project.findComponent(Prettier.of);
  }
  readonly file: JsonFile<prettier.Options>;
  constructor(scope: Scope, initialOptions: PrettierInitialOptions = {}) {
    super(scope, PrettierOptions.getOptions(initialOptions, { scope }));
    const pkg = PackageJson.required(this)
      .addDevDeps('prettier')
      .addScripts(this.options.defaultScripts);

    const autoOrganizeImports =
      this.options.features?.autoOrganizeImports ?? true;
    if (autoOrganizeImports) {
      pkg.addDevDeps('prettier-plugin-organize-imports');
    }
    const config = this.options.config ?? {};
    this.file = new JsonFile<prettier.Options>(
      this,
      { basename: this.options.configFilename },
      {
        ...config,
        plugins: [
          ...(config.plugins ?? []),
          ...(autoOrganizeImports ? ['prettier-plugin-organize-imports'] : []),
        ],
      },
    );
  }
}
