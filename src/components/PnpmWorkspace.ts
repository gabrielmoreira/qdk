import { relative } from 'path';
import {
  Component,
  createOptions,
  OptionsMerger,
  YamlFile,
  Yamlifiable,
} from '../index.js';

export interface PnpmWorkspaceOptionsType {
  configFilename: string;
  packages: string[];
  catalog: Record<string, string> | undefined;
  catalogs: Record<string, Record<string, string> | undefined> | undefined;
}
export type PnpmWorkspaceInitialOptions = Partial<
  Omit<PnpmWorkspaceOptionsType, 'configFilename'>
>;

const PnpmWorkspaceDefaults = {
  configFilename: 'pnpm-workspace.yaml',
  packages: [],
  catalog: undefined,
  catalogs: undefined,
} satisfies PnpmWorkspaceOptionsType;

const optionsMerger: OptionsMerger<
  PnpmWorkspaceOptionsType,
  PnpmWorkspaceInitialOptions,
  typeof PnpmWorkspaceDefaults
> = (initialOptions, defaults) => {
  return {
    ...defaults,
    ...initialOptions,
  };
};

export const PnpmWorkspaceOptions = createOptions(
  'PnpmWorkspaceOptions',
  PnpmWorkspaceDefaults,
  optionsMerger,
);

export class PnpmWorkspace extends Component<PnpmWorkspaceOptionsType> {
  yaml: YamlFile;
  constructor(scope: Component, options: PnpmWorkspaceInitialOptions = {}) {
    super(scope, PnpmWorkspaceOptions.getOptions(options, { scope }));
    const { configFilename, ...initialData } = this.options;
    this.yaml = new YamlFile<Yamlifiable>(
      this,
      { basename: configFilename },
      initialData,
    );
    this.hook('synth:before', () => {
      this.yaml.merge({
        packages: scope.project.subprojects.map(project =>
          relative(scope.project.options.path, project.options.path),
        ),
      });
    });
  }
}
