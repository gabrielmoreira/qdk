#!/usr/bin/env -S node --import tsx
import { Cli, Command } from 'clipanion';
import { existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { InitCommand } from './init/index.mjs';
import { SynthCommand } from './synth/index.mjs';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const [_node, _app, ...args] = process.argv;

const cli = new Cli({
  binaryLabel: `qdk`,
  binaryName: `npx qdk`,
});

cli.register(InitCommand);
cli.register(SynthCommand);
cli.register(
  class VersionCommand extends Command {
    static readonly paths = [['version']];
    async execute() {
      let dir = import.meta.dirname;
      while (!existsSync(join(dir, 'package.json'))) {
        const parent = dirname(dir);
        if (parent === dir) throw new Error('package.json not found');
        dir = parent;
      }
      const path = join(relative(import.meta.dirname, dir), 'package.json');
      const json = (await import(path)) as Record<string, string>;
      console.log(json.version);
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
