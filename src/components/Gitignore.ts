import { Component, Scope, TextFile } from '../index.js';

export interface GitignoreOptions {
  pattern?: string[];
}
export class Gitignore extends Component<GitignoreOptions> {
  private ignored: string[] = [];
  constructor(scope: Scope, options: GitignoreOptions) {
    super(scope, options);
    const file = new TextFile(this, { basename: '.gitignore' }, '');
    if (this.options.pattern?.length) this.add(...this.options.pattern);
    this.hook('synth:before', () => {
      file.update(() => this.ignored.join('\n'));
    });
  }
  add(...pattern: string[]): this {
    this.ignored.push(...pattern);
    return this;
  }
}
