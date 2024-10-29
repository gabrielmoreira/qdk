/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/class-literal-property-style */
import { Attributes, Span, SpanStatusCode, Tracer } from '@opentelemetry/api';
import { Hookable } from 'hookable';
import { TreeNode } from 'tree-console';
import {
  assertRequired,
  BaseProject,
  BaseProjectOptionsType,
  Component,
  QdkApp,
  QdkFile,
  QdkFileOptionsType,
  relativeToCwd,
  Scope,
  SynthOptions,
  Type,
} from '../index.mjs';
import { exec, execSync } from '../system/execution.mjs';
import { createLogger, Logger } from '../system/logger.mjs';

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
  _tracer?: Tracer;
  protected logger: Logger;
  get nodeType(): QdkNodeType {
    return 'node';
  }
  setTracer(tracer: Tracer) {
    this._tracer = tracer;
  }
  constructor(parent?: Scope, nodeName?: string) {
    super();
    this.nodeName = nodeName
      ? this.constructor.name + '(' + nodeName + ')'
      : this.constructor.name;
    this.parent = parent;
    const project = parent instanceof QdkApp ? undefined : parent?.project;
    if (this instanceof BaseProject) {
      this.logger = createLogger('project', this.nodeName);
      project?.addSubproject(this);
    } else if (this instanceof Component) {
      this.logger = createLogger('component', this.nodeName);
      if (parent === undefined)
        throw new Error('Components should have a project as parent scope');
      project?.addComponent(this);
    } else if (this instanceof QdkFile) {
      this.logger = createLogger('file', this.nodeName);
      if (parent === undefined)
        throw new Error('Files should have a project as parent scope');
      project?.addFile(this);
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

  get tracer(): Tracer | undefined {
    if (this._tracer) {
      return this._tracer;
    }
    return this.parent?.tracer;
  }

  get app(): QdkApp {
    if (this instanceof QdkApp) return this;
    return assertRequired(this.parent?.app, 'No app found');
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
    return assertRequired(
      this.findComponent(predicate),
      `A component is required for ${predicate.toString()}`,
    );
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
    await this.traceAsyncCall('preSynthetize', async () => {
      const showProjectLogs = this.nodeType === 'project';
      if (showProjectLogs) {
        this.log('Synthesizing project files...');
      }
      await this.callHook('synth:before', options);
      for (const child of this.children) {
        await child.preSynthetize(options);
      }
    });
  }

  protected async postSynthetize(options: SynthOptions) {
    await this.traceAsyncCall('postSynthetize', async () => {
      for (const child of this.children) {
        await child.postSynthetize(options);
      }
      await this.callHook('synth:after', options);
    });
  }

  callHook<NameT extends string>(
    name: NameT,
    ...arguments_: any[]
  ): Promise<any> {
    return this.traceAsyncCall(`callHook(${name})`, () =>
      super.callHook(name, arguments_),
    );
  }

  protected async synthetize(options: SynthOptions) {
    await this.traceAsyncCall('synthetize', async () => {
      for (const child of this.children) {
        await child.synthetize(options);
      }
      await this.callHook('synth', options);
    });
  }

  protected async traceAsyncCall<T>(
    name: string,
    fn: () => Promise<T>,
    context?: { attributes?: Attributes },
  ): Promise<T> {
    if (this.tracer) {
      return this.tracer.startActiveSpan(
        `${this.nodeName}.${name}`,
        async span => {
          try {
            this.setSpanContext(span, context);
            const result = await fn();
            this.setSpanResult(span, result);
            return result;
          } catch (e) {
            this.setSpanError(span, e);
            throw e;
          } finally {
            span.end();
          }
        },
      );
    }
    return fn();
  }

  private setSpanContext(
    span: Span,
    context?: { attributes?: Attributes },
  ): void {
    if (context?.attributes) {
      span.setAttributes(context.attributes);
    }
    span.setAttributes({
      'qdk.node.type': this.nodeType,
      'qdk.node.name': this.nodeName,
      'qdk.node.class': this.constructor.name,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private setSpanResult(span: Span, _result: any) {
    span.setStatus({ code: SpanStatusCode.OK });
  }

  private setSpanError(span: Span, error: any) {
    if (error instanceof Error) {
      span.recordException(error);
    }
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : `${error}`,
    });
  }

  protected traceSyncCall<T>(
    name: string,
    fn: () => T,
    context?: { attributes?: Attributes },
  ): T {
    if (this.tracer) {
      return this.tracer.startActiveSpan(`${this.nodeName}.${name}`, span => {
        try {
          this.setSpanContext(span, context);
          const result = fn();
          this.setSpanResult(span, result);
          return result;
        } catch (e) {
          this.setSpanError(span, e);
          throw e;
        } finally {
          span.end();
        }
      });
    }
    return fn();
  }

  async synth(options: SynthOptions = {}) {
    return this.traceAsyncCall('synth', async () => {
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
    });
  }

  protected async runCmd(cmd: string, opts: { cwd?: string } = {}) {
    await this.callHook('runCmd:before', cmd, opts);
    try {
      const cwd = opts.cwd ?? this.project.options.path;
      this.debug('Executing [' + cmd + '] on [' + relativeToCwd(cwd) + ']');
      const result = await this.traceAsyncCall(`runCmd(${cmd})`, () =>
        exec(cmd, { cwd }),
      );
      this.debug('Result:', result);
      return result;
    } finally {
      await this.callHook('runCmd:after', cmd, opts);
    }
  }

  runSyncCmd(cmd: string, opts: { cwd?: string } = {}): string {
    return this.useSyncHook(
      'runSyncCmd',
      [cmd, opts],
      (cmd: string, opts: { cwd?: string } = {}): string => {
        const result = this.traceSyncCall(`runSyncCmd(${cmd})`, () =>
          execSync(cmd, {
            cwd: opts.cwd ?? this.project.options.path,
          }),
        );
        return result.toString().trim();
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
      result = await this.traceAsyncCall(`useHook(${name})`, () =>
        Promise.resolve(fn(...Array.prototype.slice.call(arguments_))),
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
      result = this.traceSyncCall(`useSyncHook(${name})`, () => fn(...args));
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
