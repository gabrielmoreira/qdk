import { exec as execAsync, execSync as osExecSync } from 'node:child_process';
import { promisify } from 'node:util';

const execNode = promisify(execAsync);

export const exec = execNode;

export const execSync = osExecSync;

export const processCwd = process.cwd.bind(process);
