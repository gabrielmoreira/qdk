import { relative } from 'node:path';
import { processCwd } from '../system/execution.js';

export const relativeToCwd = (path: string, cwd: string = processCwd()) => {
  return './' + relative(cwd, path);
};
