#!/usr/bin/env -S npx tsx
import { Cli, Command, Option } from 'clipanion';
import { findUp } from 'find-up-simple';
import { join } from 'node:path';
import t from 'typanion';
import { CanSynthesize, exec, writeFile } from './index.js';
import * as templates from './templates/init.template.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const [node, app, ...args] = process.argv;

const cli = new Cli({
  binaryLabel: `qdk`,
  binaryName: `npx qdk`,
});

cli.register(
  class InitCommand extends Command {
    static paths = [['init']];
    static usage = Command.Usage({
      description: `Create a new a QDK configuration file.`,
      examples: [
        [`Default`, `$0 init`],
        [`Custom cwd`, `$0 init --cwd /some/folder`],
        [`Use a custom template`, `$0 init --template basic`],
      ],
    });
    cwd = Option.String('--cwd', { hidden: true });
    template = Option.String('--template', {
      description: 'Available qdk.config.ts templates: [basic]',
      validator: t.isOneOf([t.isLiteral('basic')]),
    });
    async execute() {
      const opts = { cwd: this.cwd ?? process.cwd() };
      if (!(await hasQdk(opts))) {
        await installQdk(opts);
      }
      const qdkConfig = await findQdkConfig(opts);
      if (!qdkConfig) {
        await writeFile(
          join(opts.cwd, 'qdk.config.ts'),
          templates[this.template ?? 'basic'],
        );
      }
    }
  },
);

cli.register(
  class SynthCommand extends Command {
    static paths = [['synth']];
    static usage = Command.Usage({
      description: `Synthetize a QDK configuration.`,
      examples: [
        [`Default`, `$0 synth`],
        [`Custom cwd`, `$0 synth --cwd /some/folder`],
      ],
    });
    cwd = Option.String('--cwd', { hidden: true });
    checkOnly = Option.Boolean('--check-only,--check');
    async execute() {
      const opts = { cwd: this.cwd };
      const qdkProject = await loadQdk(opts);
      if (!qdkProject) {
        console.error('qdk.config.ts should export a qdk Project');
        process.exit(1);
      }
      let hasError = false;
      await qdkProject.synth({
        checkOnly: this.checkOnly,
        errorReporter: {
          report(scope, type, msg) {
            console.error(scope.nodeName, type, msg);
            hasError = true;
          },
        },
      });
      if (hasError) {
        process.exit(1);
      }
    }
  },
);
cli
  .runExit(args)
  .then(() => {
    // do nothing
  })
  .catch(e => {
    // do nothing
    console.error(e);
  });

async function loadQdk(opts: { cwd?: string }) {
  if (!(await hasQdk(opts))) {
    await installQdk(opts);
  }
  const qdkConfig = await findQdkConfig(opts);
  if (!qdkConfig) {
    console.error('qdk.config.ts not found!');
    console.log('Run the following command to create a new qdk config file:');
    console.log('npx qdk init');
    process.exit(1);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const qdkProject = (await import(qdkConfig))?.default;
  if (
    typeof qdkProject === 'object' &&
    qdkProject &&
    'synth' in qdkProject &&
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    typeof qdkProject.synth === 'function'
  ) {
    return qdkProject as CanSynthesize;
  }
}

async function hasQdk({ cwd }: { cwd?: string }) {
  try {
    await exec('npm list qdk', { cwd });
    return true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return false;
  }
}

async function installQdk({ cwd }: { cwd?: string }) {
  try {
    const result = await exec('npm install qdk', { cwd });
    console.log('qdk installed', result);
    return true;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function findQdkConfig({ cwd }: { cwd?: string }) {
  const config = await findUp('qdk.config.ts', { cwd });
  return config;
}
