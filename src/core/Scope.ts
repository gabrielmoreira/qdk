import {
  BaseProject,
  BaseProjectOptions,
  Component,
  QdkNode,
  QdkNodeType,
} from '../index.js';

export interface Scope {
  parent?: Scope;
  get component(): Component | undefined;
  get root(): Scope;
  get project(): BaseProject<BaseProjectOptions>;
  get tags(): Set<string>;
  get nodeType(): QdkNodeType;
  get nodeName(): string;
  children: QdkNode[];
  addChild(node: QdkNode): void;
  hasAllTags(...tag: string[]): boolean;
  hasAnyTag(...tag: string[]): boolean;
}
