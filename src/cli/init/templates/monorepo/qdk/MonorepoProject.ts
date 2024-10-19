import * as qdk from 'qdk';

interface MonorepoProjectOptionsBaseType {
  packageJson?: qdk.PackageJsonInitialOptions;
  npmrc?: qdk.JsonifiableObject;
  mise?: qdk.JsonifiableObject;
}
export type MonorepoProjectOptionsType = qdk.BaseProjectOptionsType &
  MonorepoProjectOptionsBaseType;
export type MonorepoProjectInitialOptionsType =
  qdk.BaseProjectInitialOptionsType & MonorepoProjectOptionsBaseType;

const MonorepoProjectDefaults: Partial<MonorepoProjectOptionsType> = {
  npmrc: {},
} as const;

const merger: qdk.OptionsMerger<
  MonorepoProjectOptionsType,
  MonorepoProjectInitialOptionsType,
  typeof MonorepoProjectDefaults,
  qdk.PartialOptionsContext
> = (initialOptions, defaults, context) => {
  return {
    ...qdk.BaseProjectOptions.getOptions(initialOptions, context),
    ...defaults,
    npmrc:
      typeof initialOptions.npmrc === 'boolean'
        ? initialOptions.npmrc
          ? defaults.npmrc
          : undefined
        : (initialOptions.npmrc ?? defaults.npmrc),
  };
};
export const MonorepoProjectOptions = qdk.createOptions(
  'MonorepoProjectOptions',
  MonorepoProjectDefaults,
  merger,
);

export class MonorepoProject extends qdk.BaseProject<MonorepoProjectOptionsType> {
  static create(opts: MonorepoProjectInitialOptionsType) {
    return new MonorepoProject(MonorepoProjectOptions.getOptions(opts, {}));
  }

  constructor(options: MonorepoProjectOptionsType) {
    super(undefined, options);
    new qdk.PnpmPackageManager(this, { workspace: true });
    new qdk.PackageJson(this, this.options.packageJson);
    if (this.options.npmrc) {
      new qdk.IniFile(
        this,
        {
          basename: '.npmrc',
        },
        this.options.npmrc,
      );
    }
    if (this.options.mise) {
      new qdk.TomlFile(
        this,
        {
          basename: '.mise.toml',
        },
        this.options.mise,
      );
    }
  }
}
