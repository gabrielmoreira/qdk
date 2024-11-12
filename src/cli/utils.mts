import { findUp } from 'find-up-simple';
import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
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

let version: string | undefined;
export async function getQdkVersion() {
  if (version) return version;
  let dir = import.meta.dirname;
  while (!existsSync(join(dir, 'package.json'))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error('package.json not found');
    dir = parent;
  }
  const path = join(relative(import.meta.dirname, dir), 'package.json');
  const json = (await import(path)) as Record<string, string>;
  return (version = json.version);
}

export async function installQdk({ cwd }: { cwd?: string }) {
  try {
    await exec(`npm install qdk@${await getQdkVersion()} --no-save`, { cwd });
    log('qdk installed!');
    return true;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function findQdkConfig({ cwd }: { cwd?: string }) {
  const config =
    (await findUp('qdk.config.mts', { cwd })) ??
    (await findUp('qdk.config.ts', { cwd }));
  return config;
}
