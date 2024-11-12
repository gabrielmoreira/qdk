import { version } from '#package.json';
import { QdkApp, setForceAllPackageManagerInstall } from '#qdk';
import { trace } from '@opentelemetry/api';
import { Command, Option } from 'clipanion';
import { startTracing } from '../../instrumentation/instrumentation.mjs';
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
  trace = Option.Boolean('--trace');
  oltpEndpoint = Option.String('--otlp-endpoint');
  checkOnly = Option.Boolean('--check-only,--check');
  forcePkgInstall = Option.Boolean('--force-pkg-install,-pi', {
    description: 'Do not skip any subproject install on a monorepo',
  });
  async execute() {
    const opts = { cwd: this.cwd };
    setForceAllPackageManagerInstall(!this.forcePkgInstall);
    const qdkProject = await loadQdk(opts);
    if (!qdkProject) {
      console.error('[qdk.config.mts] Invalid QDK configuration');
      process.exit(1);
    }
    let hasError = false;
    try {
      const stopTracing = this.trace
        ? startTracing({ url: this.oltpEndpoint })
        : () => void 0;

      if (qdkProject instanceof QdkApp) {
        const tracer = trace.getTracer('qdk', version);
        qdkProject.setTracer(tracer);
      }
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
      await stopTracing();
    } catch (e) {
      console.error(e);
    }
    if (hasError) {
      process.exit(1);
    }
  }
}
