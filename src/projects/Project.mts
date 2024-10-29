import {
  BaseProject,
  BaseProjectInitialOptionsType,
  BaseProjectOptions,
  BaseProjectOptionsType,
  createOptions,
  OptionsMerger,
  PartialOptionsContext,
  Scope,
} from '../index.mjs';

type ProjectOptionsBaseType = object;
export type ProjectOptionsType = BaseProjectOptionsType &
  ProjectOptionsBaseType;

export type ProjectInitialOptionsType = Pick<ProjectOptionsType, 'name'> &
  BaseProjectInitialOptionsType &
  ProjectOptionsBaseType;

const ProjectDefaults = {} satisfies Partial<ProjectOptionsType>;

const optionsMerger: OptionsMerger<
  ProjectOptionsType,
  ProjectInitialOptionsType,
  typeof ProjectDefaults,
  PartialOptionsContext
> = (initialOptions, defaults, context) => {
  const projectOptions = BaseProjectOptions.getOptions(
    {
      ...defaults,
      ...initialOptions,
    },
    context,
  );
  return {
    ...defaults,
    ...projectOptions,
  };
};

export const ProjectOptions = createOptions(
  'ProjectOptions',
  ProjectDefaults,
  optionsMerger,
);

export class Project<
  T extends ProjectOptionsType = ProjectOptionsType,
> extends BaseProject<T> {
  static create(options: ProjectInitialOptionsType) {
    return new Project(null, options);
  }
  constructor(
    scope: Scope | undefined | null,
    options: ProjectInitialOptionsType,
  ) {
    super(scope, ProjectOptions.getOptions(options, { scope }) as T);
  }
}
