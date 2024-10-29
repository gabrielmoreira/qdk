import { Command, Option } from 'clipanion';
import * as t from 'typanion';
import { hasQdk, installQdk, log } from '../utils.mjs';
import { copyTemplate } from './copyTemplate.mjs';

const templates = ['blank', 'monorepo', 'simple', 'readme'] as const;
type Template = (typeof templates)[number];

export class InitCommand extends Command {
  static readonly paths = [['init']];
  static readonly usage = Command.Usage({
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
  template = Option.String('-t,--template', {
    description: 'Available qdk.config.mts templates: [simple]',
    validator: t.isOneOf(templates.map(it => t.isLiteral(it))),
  });
  forceOverwrite = Option.Boolean('-f,--force');
  async execute() {
    const opts = {
      cwd: this.cwd ?? process.cwd(),
      forceOverwrite: this.forceOverwrite ?? false,
    };
    if (!(await hasQdk(opts))) {
      await installQdk(opts);
    }

    const templateName: Template =
      this.template ?? (this.blank ? 'blank' : 'simple');

    const generatedFiles = await copyTemplate(templateName, opts);
    if (generatedFiles.includes('qdk.config.mts')) {
      log('The qdk.config.mts file has been created successfully.');
      log('Please adjust your qdk.config.mts file as needed.');
    } else {
      log(`${generatedFiles.length} generated file(s) in your project.`);
    }
    console.log('');
    log('Run [npx qdk synth] to synthesize your project.');
  }
}
