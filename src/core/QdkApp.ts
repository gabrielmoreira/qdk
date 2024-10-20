import {
  assertRequired,
  BaseProject,
  BaseProjectOptionsType,
  CanSynthesize,
  QdkNode,
  QdkNodeType,
  SynthOptions,
} from '../index.js';

export interface QdkAppOptions {
  cwd: string;
}

export class QdkApp<T extends QdkAppOptions = QdkAppOptions>
  extends QdkNode
  implements CanSynthesize
{
  options: T;
  private rootProject: BaseProject | null = null;

  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  get nodeType(): QdkNodeType {
    return 'app';
  }
  constructor(options: T) {
    super();
    this.options = options;
  }

  get project(): BaseProject<BaseProjectOptionsType> {
    return assertRequired(
      this.rootProject,
      'No project found. Please ensure that a project is added to this app as the root project.',
    );
  }

  addChild(node: QdkNode): void {
    if (node instanceof BaseProject) {
      if (this.rootProject !== null) {
        throw new Error(
          'Multiple root projects detected. Ensure there is only one root project and add subprojects to it.',
        );
      }
      this.rootProject = node;
      super.addChild(node);
    } else {
      throw new Error('A QdkApp can only have projects as direct children.');
    }
  }

  synth(options?: SynthOptions): Promise<void> {
    assertRequired(this.project, 'Project is required');
    return super.synth(options);
  }
}
