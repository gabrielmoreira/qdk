import { describe, expect, it } from 'vitest';
import { parseDependency } from '../parseDependency.mjs';

// Test cases with inputs and expected results
const testCases = [
  {
    input: '@repo/package-name',
    expected: {
      scope: '@repo',
      name: '@repo/package-name',
      nameWithoutScope: 'package-name',
      version: undefined,
    },
  },
  {
    input: '@repo/package-name@^1.0.0',
    expected: {
      scope: '@repo',
      name: '@repo/package-name',
      nameWithoutScope: 'package-name',
      version: '^1.0.0',
    },
  },
  {
    input: 'package-name',
    expected: {
      scope: undefined,
      name: 'package-name',
      nameWithoutScope: 'package-name',
      version: undefined,
    },
  },
  {
    input: 'package-name@^1.0.0',
    expected: {
      scope: undefined,
      name: 'package-name',
      nameWithoutScope: 'package-name',
      version: '^1.0.0',
    },
  },
  {
    input: 'p@1.0-beta',
    expected: {
      scope: undefined,
      name: 'p',
      nameWithoutScope: 'p',
      version: '1.0-beta',
    },
  },
];

const errorTestCases = [
  { input: '', error: 'Invalid name: []' },
  { input: '  ', error: 'Invalid name: [  ]' },
  { input: '\t', error: 'Invalid name: [\t]' },
  { input: '\n', error: 'Invalid name: [\n]' },
];

describe('parseDependency', () => {
  it.each(testCases)('parses $input correctly', ({ input, expected }) => {
    const parsed = parseDependency(input);
    expect(parsed).toEqual(expected);
  });
  it.each(errorTestCases)(
    'throw error $error when parsing $input',
    ({ input, error }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let errorInstance: any;
      try {
        parseDependency(input);
      } catch (e) {
        errorInstance = e;
      }
      expect(errorInstance).toBeInstanceOf(Error);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(errorInstance.message).toBe(error);
    },
  );
});
