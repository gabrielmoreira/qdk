import { dirname, join } from 'node:path';

export const qdkPackageRoot = join(
  // eslint-disable-next-line no-undef
  dirname(require.resolve('qdk/package.json')),
);
