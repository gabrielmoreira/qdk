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

export function createOptions<
  I,
  O,
  D = I,
  C = OptionsContext,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  M extends Record<string, unknown> = {},
>(
  name: symbol | string,
  defaults: D,
  merger: OptionsMerger<O, I, D, C>,
  methods?: M,
) {
  const data = {
    defaults,
    merger,
    originalDefaults: { ...defaults },
  };

  const base = {
    merge: merger,
    restoreDefaults() {
      data.defaults = { ...data.originalDefaults };
    },
    replaceDefaults(newDefaults: D) {
      data.defaults = newDefaults;
    },
    updateDefaults(fn: (defaults: Draft<D>) => D | void) {
      const updatedDefaults = produce(fn, data.defaults)(data.defaults);
      data.defaults = updatedDefaults;
    },
    getOptions(input: I, context: C): O {
      return data.merger(input, data.defaults, context);
    },
    getDefaults(): D {
      return { ...data.defaults };
    },
  } as const;

  return { ...methods, ...base } as typeof base & M;
}
