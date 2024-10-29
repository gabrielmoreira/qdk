import {
  BaseProject,
  BaseProjectOptionsType,
  Component,
  QdkApp,
  QdkNode,
  QdkNodeType,
} from '../index.mjs';

export interface Scope {
  parent?: Scope;
  get component(): Component | undefined;
  get root(): Scope;
  get app(): QdkApp;
  get project(): BaseProject<BaseProjectOptionsType>;
  get tags(): Set<string>;
  get nodeType(): QdkNodeType;
  get nodeName(): string;
  children: QdkNode[];
  addChild(node: QdkNode): void;
  hasAllTags(...tag: string[]): boolean;
  hasAnyTag(...tag: string[]): boolean;
}
