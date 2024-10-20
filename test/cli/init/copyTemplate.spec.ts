import { vol } from 'memfs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi, vitest } from 'vitest';
import { copyTemplate } from '../../../src/cli/init/copyTemplate.js';
import { qdkPackageRoot } from '../../../src/system/package.cjs';
import { reset, resetFilesystem } from '../../test-helpers.js';

vitest.mock('fs', async () => {
  return await vi.importActual('memfs');
});

vitest.mock('');

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
        [join(qdkPackageRoot, '/templates/blank/qdk.config.js')]: 'something',
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
