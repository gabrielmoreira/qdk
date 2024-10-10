import {
  BaseProject,
  BaseProjectInitialOptions,
  BaseProjectOptions,
  DefaultOptions,
  Scope,
} from '../index.js';

export type ProjectOptions = BaseProjectOptions & {};

export type ProjectInitialOptions = Pick<ProjectOptions, 'name'> &
  BaseProjectInitialOptions;

export class Project<
  T extends ProjectOptions = ProjectOptions,
> extends BaseProject<T> {
  static defaults<T extends ProjectOptions>(
    options: ProjectInitialOptions,
    scope?: Scope,
  ): T {
    const opts = BaseProject.defaults(options, scope);
    return {
      ...DefaultOptions.get(Project),
      ...opts,
    } as T;
  }
  static create(options: ProjectInitialOptions) {
    return new Project(null, options);
  }
  constructor(scope: Scope | undefined | null, options: ProjectInitialOptions) {
    super(scope, Project.defaults(options, scope ?? undefined));
  }
}
