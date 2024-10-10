import { AbstractConstructor, Constructor } from 'type-fest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export interface HasOptions<O = unknown> {
  options: O;
}

export type TypeWithOptions<T extends HasOptions> =
  | Constructor<T>
  | AbstractConstructor<T>;

class OptionsRegistry {
  private optionsMap = new Map<TypeWithOptions<Any>, Any>();

  register<T>(
    classType: TypeWithOptions<HasOptions<T>>,
    options: Partial<T>,
  ): this {
    this.optionsMap.set(classType, options);
    return this;
  }

  extends<T>(
    classType: TypeWithOptions<HasOptions<T>>,
    options: Partial<T>,
  ): this {
    const currentOptions = this.get(classType);
    this.optionsMap.set(classType, {
      ...(currentOptions ?? {}),
      ...(typeof options === 'object' ? options : {}),
    });
    return this;
  }

  get<T>(classType: TypeWithOptions<HasOptions<T>>): Partial<T> | undefined {
    return this.optionsMap.get(classType) as Partial<T> | undefined;
  }

  getWithPartialDefaults<T>(
    classType: TypeWithOptions<HasOptions<T>>,
    defaults: Partial<T>,
  ): Partial<T> {
    return structuredClone({
      ...defaults,
      ...this.optionsMap.get(classType),
    }) as Partial<T>;
  }

  getWithDefaults<T>(
    classType: TypeWithOptions<HasOptions<T>>,
    defaults: T,
  ): T {
    return structuredClone({
      ...defaults,
      ...this.optionsMap.get(classType),
    }) as T;
  }

  toSnapshot() {
    const newMap = new Map<TypeWithOptions<Any>, Any>();
    this.optionsMap.forEach((value, key) => {
      newMap.set(key, structuredClone(value));
    });
    return newMap;
  }

  fromSnapshot(map: Map<TypeWithOptions<Any>, Any>) {
    this.optionsMap = new Map(map);
  }
}

export const DefaultOptions = new OptionsRegistry();
