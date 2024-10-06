import { Component, JsonFile, PackageJson, Scope } from '../index.js';

export interface PrettierOptions {
  scripts?: {
    format?: string;
  };
}
export class Prettier extends Component {
  constructor(scope: Scope, options: PrettierOptions = {}) {
    super(scope, options);
    PackageJson.required(this)
      .addDevDeps('prettier')
      .setScript('format', options.scripts?.format ?? 'prettier . --write');
    new JsonFile(
      this,
      { basename: '.prettierrc' },
      {
        arrowParens: 'avoid',
        singleQuote: true,
        plugins: [],
        overrides: [],
      },
    );
  }
}
