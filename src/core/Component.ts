/* eslint-disable @typescript-eslint/class-literal-property-style */
import { HasOptions, QdkNodeType, Scope, ScopedNode } from '../index.js';

export abstract class Component<T = unknown>
  extends ScopedNode
  implements HasOptions<T>
{
  options: T;
  get nodeType(): QdkNodeType {
    return 'component';
  }
  constructor(scope: Scope, options: T, nodeName?: string) {
    super(scope, nodeName);
    this.options = options;
    if (this.options) {
      this.debug('Options', this.options);
    }
  }
}
