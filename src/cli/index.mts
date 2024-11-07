#!/usr/bin/env -S node --import tsx
import { Cli } from 'clipanion';
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

cli
  .runExit(args)
  .then(() => {
    // do nothing
  })
  .catch(e => {
    // do nothing
    console.error(e);
  });
