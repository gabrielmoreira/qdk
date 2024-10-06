import {
  Project,
  ProjectInitialOptions,
  ProjectOptions,
  Scope,
} from '../index.js';

export type SimpleProjectOptions = ProjectOptions & {};

export type SimpleProjectInitialOptions = Pick<SimpleProjectOptions, 'name'> &
  ProjectInitialOptions;

export class SimpleProject<T extends SimpleProjectOptions> extends Project<T> {
  static defaults<T extends SimpleProjectOptions>(
    options: SimpleProjectInitialOptions,
    scope?: Scope,
  ): T {
    const opts = Project.defaults(options, scope);
    return {
      ...opts,
    } as T;
  }
  constructor(
    scope: Scope | undefined | null,
    options: SimpleProjectInitialOptions,
  ) {
    super(scope, SimpleProject.defaults(options, scope ?? undefined));
  }
}
