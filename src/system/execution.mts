import { exec as execAsync, execSync as osExecSync } from 'node:child_process';
import { promisify } from 'node:util';
import { traceIt } from '../utils/traceIt.mjs';
import { createLogger } from './logger.mjs';

const logger = createLogger('execution');

const execNode = promisify(execAsync);

export const exec = traceIt('exec', execNode, logger);

export const execSync = traceIt('execSync', osExecSync, logger);

export const processCwd = traceIt(
  'processCwd',
  process.cwd.bind(process),
  logger,
);
