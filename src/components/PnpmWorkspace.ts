import { relative } from 'path';
import { Component, YamlFile, Yamlifiable } from '../index.js';

export class PnpmWorkspace extends Component {
  yaml: YamlFile;
  constructor(scope: Component) {
    super(scope, undefined);
    this.yaml = new YamlFile<Yamlifiable>(
      this,
      { basename: 'pnpm-workspace.yaml' },
      {
        packages: [],
      },
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
