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

const log = (...msg: unknown[]) => {
  console.log('QDK:', ...msg);
};

type TemplateKey = keyof typeof templates;
const templateKeys: TemplateKey[] = Object.keys(templates) as TemplateKey[];

const bannerString = `
/*
 * To setup QDK, run the following commands:
 * \`\`\`sh
 * npx qdk init
 * \`\`\`
 *
 * After that you can run:
 * \`\`\`sh
 * npx qdk synth
 * \`\`\`
 */
`;

cli.register(
  class InitCommand extends Command {
    static paths = [['init']];
    static usage = Command.Usage({
      description: `Create a new a QDK configuration file.`,
      examples: [
        [`Default`, `$0 init`],
        [`Custom cwd`, `$0 init --cwd /some/folder`],
        [`Use a custom template`, `$0 init --template simple`],
        [`Monorepo example`, `$0 init --template monorepo`],
      ],
    });
    cwd = Option.String('--cwd', { hidden: true });
    blank = Option.Boolean('--blank');
    template = Option.String('--template', {
      description: 'Available qdk.config.ts templates: [simple]',
      validator: t.isOneOf(templateKeys.map(it => t.isLiteral(it))),
    });
    async execute() {
      const opts = { cwd: this.cwd ?? process.cwd() };
      if (!(await hasQdk(opts))) {
        await installQdk(opts);
      }
      const qdkConfig = await findQdkConfig(opts);
      if (!qdkConfig) {
        const templateName: keyof typeof templates =
          this.template ?? (this.blank ? 'blank' : 'simple');
        const template = templates[templateName];
        const content = template() + '\n' + bannerString;
        await writeFile(join(opts.cwd, 'qdk.config.ts'), content);
        log('The qdk.config.ts file has been created successfully.');
        log('Please adjust your qdk.config.ts file as needed.');
      }
      log('Run [npx qdk synth] to synthesize your project.');
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
        console.error(
          '[qdk.config.ts] The exported configuration is not valid for QDK',
        );
        process.exit(1);
      }
      let hasError = false;
      try {
        await qdkProject.synth({
          checkOnly: this.checkOnly,
          errorReporter: {
            report(scope, type, msg, extra) {
              console.error(scope.nodeName, type, msg);
              if (extra) console.dir(extra, { depth: 100 });
              hasError = true;
            },
          },
        });
      } catch (e) {
        console.error(e);
      }
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

interface LoadOpts {
  cwd?: string;
}
async function loadQdk(opts: LoadOpts): Promise<CanSynthesize | undefined> {
  if (!(await hasQdk(opts))) {
    await installQdk(opts);
  }
  const qdkConfig = await findQdkConfig(opts);
  if (!qdkConfig) {
    console.error('qdk.config.ts not found!');
    log('Run the following command to create a new qdk config file:');
    log('npx qdk init');
    process.exit(1);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const qdkProjectType = await import(qdkConfig);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  let qdkProject = tryGetQdkAppInstance(qdkProjectType?.default, opts);
  if (qdkProject) return qdkProject;

  qdkProject = tryGetQdkAppInstance(qdkProjectType, opts);
  if (qdkProject) return qdkProject;
}

function tryGetQdkAppInstance(
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
    await exec('npm install qdk', { cwd });
    log('qdk installed!');
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
