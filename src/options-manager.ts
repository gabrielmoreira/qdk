import { Draft, produce } from 'immer';
import { Scope } from './index.js';

export interface OptionsContext {
  scope: Scope;
}

export interface PartialOptionsContext {
  scope?: Scope | null;
}

export type OptionsMerger<
  O,
  I = Partial<O>,
  D = Partial<O>,
  C = OptionsContext,
> = (input: I, defaults: D, context: C) => O;

export function createOptionsManager<
  I,
  O,
  D = I,
  C = OptionsContext,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  M extends Record<string, unknown> = {},
>(name: symbol, defaults: D, merger: OptionsMerger<O, I, D, C>, methods?: M) {
  const extensions: Record<symbol, OptionsMerger<O, I, D, C>> = {};
  const extensionDefaults: Record<symbol, D> = {};
  const originalDefaults: Record<symbol, D> = {};

  extensions[name] = merger;
  extensionDefaults[name] = defaults;
  originalDefaults[name] = { ...defaults };

  const options = {
    restoreDefaults() {
      extensionDefaults[name] = originalDefaults[name];
    },
    replaceDefaults(newDefaults: D) {
      extensionDefaults[name] = newDefaults;
    },
    updateDefaults(fn: (defaults: Draft<D>) => D | void) {
      const newState = produce(
        fn,
        extensionDefaults[name],
      )(extensionDefaults[name]);
      extensionDefaults[name] = newState;
    },
    getOptions(input: I, context: C): O {
      return extensions[name](input, extensionDefaults[name], context);
    },
    getDefaults(): D {
      return { ...extensionDefaults[name] };
    },
  } as const;
  return { ...methods, ...options } as typeof options & M;
}
