import fs from 'fs';
import { globbySync } from 'globby';

export interface LoadTemplateOptions {
  templatePath: string;
}

export function loadTemplates(options: LoadTemplateOptions) {
  return globbySync(`**/*`, {
    cwd: options.templatePath,
    dot: true,
    fs,
  }).map(it => ({
    name: it,
  }));
}
