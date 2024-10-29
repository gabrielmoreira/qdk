import { reset, resetFilesystem } from '#test/helpers.mjs';
import { vol } from 'memfs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi, vitest } from 'vitest';
import { qdkPackageRoot } from '../../../system/package.cjs';
import { copyTemplate } from '../copyTemplate.mjs';

vitest.mock('fs', async () => {
  return await vi.importActual('memfs');
});

vitest.mock('fs/promises', async () => {
  return (await vi.importActual('memfs')).promises;
});
vitest.mock('@/system/package.cjs', () => {
  return {
    qdkPackageRoot: '/pkg/qdk',
  };
});

describe('copyTemplate', () => {
  beforeEach(() => reset());

  it('can copy a blank template', async () => {
    // Given
    resetFilesystem({
      json: {
        // create a fake template
        [join(qdkPackageRoot, '/templates/blank/qdk.config.mjs')]: 'something',
        [join(qdkPackageRoot, '/templates/blank/.qdk/components/config.ts')]:
          'config',
      },
    });
    // When
    await copyTemplate('blank', { cwd: '/tmp', forceOverwrite: false });
    // Then
    expect(vol.toJSON()).toMatchSnapshot();
  });
});
