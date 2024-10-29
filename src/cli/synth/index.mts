import { Command, Option } from 'clipanion';
import { loadQdk } from '../utils.mjs';

export class SynthCommand extends Command {
  static readonly paths = [['synth']];
  static readonly usage = Command.Usage({
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
        '[qdk.config.mts] The exported configuration is not valid for QDK',
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
}
