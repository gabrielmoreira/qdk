import {
  Component,
  Project,
  ProjectOptions,
  QdkNode,
  QdkNodeType,
} from '../index.js';

export interface Scope {
  parent?: Scope;
  get component(): Component | undefined;
  get root(): Scope;
  get project(): Project<ProjectOptions>;
  get tags(): Set<string>;
  get nodeType(): QdkNodeType;
  children: QdkNode[];
  addChild(node: QdkNode): void;
  hasAllTags(...tag: string[]): boolean;
  hasAnyTag(...tag: string[]): boolean;
}
