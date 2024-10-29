import { findUp } from 'find-up-simple';
import { dirname } from 'node:path';
import { CanSynthesize, exec } from '../index.mjs';

export const log = (...msg: unknown[]) => {
  console.log('QDK:', ...msg);
};

export interface LoadOpts {
  cwd?: string;
}

export async function loadQdk(
  opts: LoadOpts,
): Promise<CanSynthesize | undefined> {
  if (!(await hasQdk(opts))) {
    await installQdk(opts);
  }
  const qdkConfig = await findQdkConfig(opts);
  if (!qdkConfig) {
    console.error('qdk.config.mts not found!');
    log('Run the following command to create a new qdk config file:');
    log('npx qdk init');
    process.exit(1);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const qdkProjectType = await import(qdkConfig);
  const qdkAppOpts = { cwd: dirname(qdkConfig) };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  let qdkProject = tryGetQdkAppInstance(qdkProjectType?.default, qdkAppOpts);
  if (qdkProject) return qdkProject;

  qdkProject = tryGetQdkAppInstance(qdkProjectType, qdkAppOpts);
  if (qdkProject) return qdkProject;
}

export function tryGetQdkAppInstance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  objectType: any,
  opts: LoadOpts,
): CanSynthesize | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const obj = new objectType(opts);
    if ('synth' in obj) {
      return obj as CanSynthesize;
    } else {
      // console.log('The exported configuration is not valid for QDK');
    }
  } catch (e) {
    console.log(e);
    // ignore
  }
  return undefined;
}

export async function hasQdk({ cwd }: { cwd?: string }) {
  try {
    await exec(`node -e 'import { QdkApp } from "qdk"' --input-type='module'`, {
      cwd,
    });
    return true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return false;
  }
}

export async function installQdk({ cwd }: { cwd?: string }) {
  try {
    await exec('npm install qdk', { cwd });
    log('qdk installed!');
    return true;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function findQdkConfig({ cwd }: { cwd?: string }) {
  const config = await findUp('qdk.config.mts', { cwd });
  return config;
}
