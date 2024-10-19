import * as qdk from 'qdk';
import {
  NodeProject,
  NodeProjectInitialOptionsType,
  NodeProjectOptions,
  NodeProjectOptionsType,
} from './NodeProject.js';

interface TsProjectOptionsBaseType {
  tsconfig: qdk.TsConfigInitialOptionsType;
}
export type TsProjectOptionsType = NodeProjectOptionsType &
  TsProjectOptionsBaseType;
export type TsProjectInitialOptionsType = NodeProjectInitialOptionsType &
  Partial<TsProjectOptionsBaseType>;

const TsProjectDefaults = {
  tsconfig: {
    autoInstallDevDependencies: false,
    extends: ['@repo/tsconfig/node.json'],
  },
} satisfies Partial<TsProjectOptionsType>;

const tsProjectOptionsMerger: qdk.OptionsMerger<
  TsProjectOptionsType,
  TsProjectInitialOptionsType,
  typeof TsProjectDefaults
> = (initialOptions, defaults, context) => {
  return {
    ...NodeProjectOptions.getOptions(
      {
        ...defaults,
        ...initialOptions,
      },
      context,
    ),
    tsconfig: {
      ...defaults.tsconfig,
      ...initialOptions.tsconfig,
    },
  };
};

export const TsProjectOptions = qdk.createOptions(
  'TsProjectOptions',
  TsProjectDefaults,
  tsProjectOptionsMerger,
);

export class TsProject extends NodeProject<TsProjectOptionsType> {
  readonly typescript: qdk.Typescript;
  get tsconfig(): qdk.TsConfig {
    return this.typescript.tsconfig;
  }
  constructor(scope: qdk.Scope, options: TsProjectInitialOptionsType) {
    super(scope, TsProjectOptions.getOptions(options, { scope }));

    qdk.PackageJson.required(this).addDeps('@repo/tsconfig@workspace:*');
    this.typescript = new qdk.Typescript(this, {
      tsconfig: {
        ...this.options.tsconfig,
        autoInstallDevDependencies:
          this.options.tsconfig?.autoInstallDevDependencies ?? false,
        extends: this.options.tsconfig?.extends ?? ['@repo/tsconfig/node.json'],
      },
    });
  }
}
