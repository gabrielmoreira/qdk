// organize-imports-ignore
export * from './options-manager.js';

export * from './utils/getErrorCode.js';
export * from './utils/assertRequired.js';
export * from './utils/parseDependency.js';

export * from './system/execution.js';
export * from './system/filesystem.js';

export * from './utils/relativeToCwd.js';

export * from './core/QdkNode.js';
export * from './core/Scope.js';
export * from './core/ScopedNode.js';
export * from './files/QdkFile.js';
export * from './files/JsonFile.js';
export * from './files/SourceCodeFile.js';
export * from './files/TemplateFile.js';
export * from './files/TextFile.js';
export * from './files/YamlFile.js';
export * from './files/SampleFiles.js';
export * from './core/Component.js';

export * from './templates/eslint.template.js';
export * from './templates/gitignore.template.js';

export * from './projects/BaseProject.js';
export * from './projects/Project.js';
import { Scope } from './core/Scope.js';

export * from './components/PackageManager.js';
export * from './components/PackageJson.js';
export * from './components/EsLint.js';
export * from './components/Gitignore.js';
export * from './components/NpmPackageManager.js';
export * from './components/PnpmPackageManager.js';
export * from './components/PnpmWorkspace.js';
export * from './components/Prettier.js';
export * from './components/TsConfig.js';
export * from './components/Typescript.js';

export * from './core/QdkApp.js';

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
