// organize-imports-ignore
import dedentInstance from 'dedent';
export const dedent: typeof dedentInstance = dedentInstance;
import chalkInstance from 'chalk';
export const chalk: typeof chalkInstance = chalkInstance;
import jsConvert from 'js-convert-case';
export const caseConverter: typeof jsConvert = jsConvert;

export * from './options.mjs';

export * from './utils/getErrorCode.mjs';
export * from './utils/assertRequired.mjs';
export * from './utils/parseDependency.mjs';

export * from './system/execution.mjs';
export * from './system/filesystem.mjs';

export * from './utils/relativeToCwd.mjs';

export * from './core/QdkNode.mjs';
export * from './core/Scope.mjs';
export * from './core/ScopedNode.mjs';
export * from './files/QdkFile.mjs';
export * from './files/JsonFile.mjs';
export * from './files/SourceCodeFile.mjs';
export * from './files/TemplateFile.mjs';
export * from './files/TextFile.mjs';
export * from './files/YamlFile.mjs';
export * from './files/IniFile.mjs';
export * from './files/TomlFile.mjs';
export * from './files/SampleFiles.mjs';
export * from './core/Component.mjs';
export * from './files/TemplateFiles.mjs';

export * from './components/defaults/eslint.default.mjs';
export * from './components/defaults/gitignore.default.mjs';

export * from './projects/BaseProject.mjs';
export * from './projects/Project.mjs';
import { Scope } from './core/Scope.mjs';
import { Tracer } from '@opentelemetry/api';

export * from './components/PackageManager.mjs';
export * from './components/PackageJson.mjs';
export * from './components/EsLint.mjs';
export * from './components/Gitignore.mjs';
export * from './components/NpmPackageManager.mjs';
export * from './components/PnpmPackageManager.mjs';
export * from './components/PnpmWorkspace.mjs';
export * from './components/YarnPackageManager.mjs';
export * from './components/Prettier.mjs';
export * from './components/TsConfig.mjs';
export * from './components/Typescript.mjs';

export * from './core/QdkApp.mjs';

export type AnyString = string & Record<never, never>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Type<T> = new (...args: any[]) => T;

export interface ErrorReporter {
  report: (
    scope: Scope,
    type: string,
    msg: string,
    additionalData?: unknown,
  ) => void;
}

export type SynthOptions = {
  removeDeletedFiles?: boolean;
  tracer?: Tracer;
} & (
  | {
      checkOnly: true;
      errorReporter: ErrorReporter;
    }
  | {
      checkOnly?: false;
      errorReporter?: ErrorReporter;
    }
);
