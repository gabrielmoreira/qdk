/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/class-literal-property-style */
import { Hookable } from 'hookable';
import { TreeNode } from 'tree-console';
import {
  assertRequired,
  BaseProject,
  BaseProjectOptionsType,
  Component,
  QdkFile,
  QdkFileOptionsType,
  relativeToCwd,
  Scope,
  SynthOptions,
  Type,
} from '../index.js';
import { exec, execSync } from '../system/execution.js';
import { createLogger, Logger } from '../system/logger.js';

export type QdkNodeType = 'component' | 'project' | 'file' | 'node' | 'app';

export interface HasOptions<T> {
  options: T;
}

export interface CanSynthesize {
  synth(options?: SynthOptions): Promise<void>;
}

export abstract class QdkNode extends Hookable implements Scope, CanSynthesize {
  nodeName: string;
  parent?: Scope;
  tags = new Set<string>();
  children: QdkNode[] = [];
  protected logger: Logger;
  get nodeType(): QdkNodeType {
    return 'node';
  }
  constructor(parent?: Scope, nodeName?: string) {
    super();
    this.nodeName = nodeName
      ? this.constructor.name + '(' + nodeName + ')'
      : this.constructor.name;
    this.parent = parent;
    if (this instanceof BaseProject) {
      this.logger = createLogger('project', this.nodeName);
      parent?.project?.addSubproject(this);
    } else if (this instanceof Component) {
      this.logger = createLogger('component', this.nodeName);
      parent?.project?.addComponent(this);
    } else if (this instanceof QdkFile) {
      this.logger = createLogger('file', this.nodeName);
      parent?.project?.addFile(this);
    } else {
      this.logger = createLogger('node', this.nodeName);
    }
    parent?.addChild(this);

    // this.beforeEach(event => {
    //  console.log('before', event, this.nodeName);
    // });
    // this.afterEach(event => {
    //  console.log('after', event, this.nodeName);
    // });
    this.debug('Created');
  }

  get root(): Scope {
    if (!this.parent) return this;
    return this.parent.root;
  }

  get project(): BaseProject<BaseProjectOptionsType> {
    if (this instanceof BaseProject) return this;
    return assertRequired(this.parent?.project, 'A parent project is required');
  }

  get component(): Component | undefined {
    if (this instanceof Component) return this;
    return this.parent?.component;
  }

  addChild(node: QdkNode) {
    this.children.push(node);
    this.debug('Adding', node.nodeType, node.nodeName);
  }

  log(...message: any[]) {
    this.logger.log(...message);
  }

  warn(...message: any[]) {
    this.logger.warn(...message);
  }

  debug(...message: any[]) {
    this.logger.debug(...message);
  }

  findComponent<T extends QdkNode>(
    predicate: (node: QdkNode) => T | undefined,
  ): T | undefined {
    const component = this.children.find(predicate);
    if (component) return component as T;
    for (const node of this.children) {
      const childComponent = node.findComponent(predicate);
      if (childComponent) return childComponent;
    }
    return undefined;
  }

  ensureComponentIsNotDefined<T extends QdkNode>(
    predicate: (node: QdkNode) => T | undefined,
    message = 'This component already exist for this project',
  ) {
    const component = this.findComponent(predicate);
    if (component) throw new Error(message);
  }

  requiredComponent<T extends QdkNode>(predicate: (node: QdkNode) => T): T {
    return assertRequired(this.findComponent(predicate));
  }

  findFileOf<X extends QdkFile<any, any>>(
    path: string,
    instanceType: Type<X>,
  ): X | undefined {
    return this.project.findComponent(node =>
      node instanceof instanceType ? QdkFile.of(node, path) : undefined,
    ) as X | undefined;
  }

  findFile<T, O extends QdkFileOptionsType>(
    path: string,
  ): QdkFile<T, O> | undefined {
    return this.project.findComponent(node =>
      node instanceof QdkFile ? QdkFile.of(node, path) : undefined,
    );
  }

  hasAllTags(...tags: string[]) {
    for (const tag of tags) {
      if (!this.tags.has(tag)) {
        return false;
      }
    }
    return true;
  }

  hasAnyTag(...tags: string[]) {
    for (const tag of tags) {
      if (this.tags.has(tag)) {
        return true;
      }
    }
    return false;
  }

  protected async preSynthetize(options: SynthOptions) {
    const showProjectLogs = this.nodeType === 'project';
    if (showProjectLogs) {
      this.log('Synthesizing project files...');
    }
    await this.callHook('synth:before', options);
    for (const child of this.children) {
      await child.preSynthetize(options);
    }
  }

  protected async postSynthetize(options: SynthOptions) {
    for (const child of this.children) {
      await child.postSynthetize(options);
    }
    await this.callHook('synth:after', options);
  }

  protected async synthetize(options: SynthOptions) {
    for (const child of this.children) {
      await child.synthetize(options);
    }
    await this.callHook('synth', options);
  }

  async synth(options: SynthOptions = {}) {
    const showLogs = this.nodeType === 'project' || this.nodeType === 'app';
    if (showLogs) {
      this.log('Synthesizing files...');
    }
    await this.preSynthetize(options);
    await this.synthetize(options);
    await this.postSynthetize(options);
    if (showLogs) {
      if (options.checkOnly) {
        this.log('All synthesized files have been checked!');
      } else {
        this.log('Files synthesized successfully!');
      }
    }
  }

  protected async execCmd(cmd: string, opts: { cwd?: string } = {}) {
    await this.callHook('exec:before', cmd, opts);
    try {
      const cwd = opts.cwd ?? this.project.options.path;
      this.debug('Executing [' + cmd + '] on [' + relativeToCwd(cwd) + ']');
      const result = await exec(cmd, { cwd });
      this.debug('Result:', result);
      return result;
    } finally {
      await this.callHook('exec:after', cmd, opts);
    }
  }

  execSyncCmd(cmd: string, opts: { cwd?: string } = {}): string {
    return this.useSyncHook(
      'execSync',
      [cmd, opts],
      (cmd: string, opts: { cwd?: string } = {}): string => {
        return execSync(cmd, {
          cwd: opts.cwd ?? this.project.options.path,
        })
          .toString()
          .trim();
      },
    );
  }

  async useHook<NameT extends string, FN extends (...args: any) => R, R>(
    name: NameT,
    arguments_: Parameters<FN>,
    fn: FN,
  ): Promise<R> {
    let result = null;
    try {
      await this.callHook(`${name}:before`, arguments_);
      result = await Promise.resolve(
        fn(...Array.prototype.slice.call(arguments_)),
      );
      return result;
    } finally {
      await this.callHook(`${name}:after`, arguments_, result);
    }
  }

  useSyncHook<NameT extends string, FN extends (...args: any) => R, R>(
    name: NameT,
    arguments_: Parameters<FN>,
    fn: FN,
  ): R {
    let result = null;
    const args = Array.prototype.slice.call(arguments_);
    try {
      // this.callHook(`${name}:before`, ...args);
      result = fn(...args);
      return result;
    } finally {
      // this.callHook(`${name}:after`, ...args, result);
    }
  }

  toTreeNode(): TreeNode {
    return {
      name: this.nodeName,
      children: this.children.map(it => it.toTreeNode()),
    };
  }
}
