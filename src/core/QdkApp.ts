import {
  BaseProject,
  BaseProjectOptionsType,
  CanSynthesize,
  QdkNode,
  QdkNodeType,
} from '../index.js';

export class QdkApp extends QdkNode implements CanSynthesize {
  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  get nodeType(): QdkNodeType {
    return 'app';
  }
  constructor() {
    super();
  }

  get project(): BaseProject<BaseProjectOptionsType> {
    const projects = this.children.filter(it => it instanceof BaseProject);
    if (projects.length === 1) return projects[0];
    if (projects.length > 1)
      throw new Error(
        'This app has multiple root projects. Please consider creating a single project with subprojects.',
      );
    throw new Error(
      'No project was added to this app. Please use `this.add(your project instance)`.',
    );
  }

  add<T extends BaseProject>(scope: T): T {
    this.addChild(scope);
    return scope;
  }
}
