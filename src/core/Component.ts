/* eslint-disable @typescript-eslint/class-literal-property-style */
import { AbstractConstructor, Constructor } from 'type-fest';
import { HasOptions, QdkNodeType, Scope, ScopedNode } from '../index.js';

export abstract class Component<T = unknown>
  extends ScopedNode
  implements HasOptions<T>
{
  options: T;
  static constructorType<T>(): Constructor<T> | AbstractConstructor<T> {
    throw new Error(
      'Please implement static get componentType() { return YourComponentType } ',
    );
  }
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
