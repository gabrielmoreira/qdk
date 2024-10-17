import { afterEach, describe, expect, it, vi, vitest } from 'vitest';
import { IniFile, Project } from '../../src/index.js';
import {
  readStringFile,
  reset,
  writeFiles,
  writeStringFile,
} from '../test-helpers.js';

vitest.mock('fs', async () => {
  return await vi.importActual('memfs');
});

vitest.mock('fs/promises', async () => {
  return (await vi.importActual('memfs')).promises;
});

vitest.mock('../../src/system/execution.ts', () => {
  return {
    processCwd: vi.fn().mockReturnValue('/'),
    execSync: vi.fn().mockReturnValue('1.0.0-mock'),
    exec: vi.fn().mockResolvedValue('1.0.0-mock'),
  };
});

describe('IniFile', () => {
  afterEach(() => reset());

  it('writes to filesystem', async () => {
    // Given
    const project = new Project(null, {
      name: 'testing',
    });
    const iniData = { data: 'some data' };
    const file = new IniFile(
      project,
      {
        basename: 'test.txt',
      },
      iniData,
    );
    // When
    await file.write();
    // Then
    expect(await readStringFile('test.txt')).toBe(`data=some data\n`);
  });
  it('can load/write a complex npmrc file', async () => {
    // Given
    const filename = '.npmrc-test';
    const storedData = `
; Global npm configurations
globalconfig=\${HOME}/.npmrc

; Registry configuration
registry=https://registry.npmjs.org/

; Authentication (Access Token)
//registry.npmjs.org/:_authToken=YOUR_AUTH_TOKEN

; Proxy settings
proxy=http://proxy.example.com:8080/
https-proxy=http://proxy.example.com:8080/
no-proxy=localhost,127.0.0.1,.example.com

; Cache configuration
cache=\${HOME}/.npm/_cacache
; Minimum cache time in seconds
cache-min=86400
; Maximum cache size in bytes
cache-max=104857600

; Network settings
fetch-retries=5
fetch-retry-mintimeout=10000
fetch-retry-maxtimeout=60000

; Logging configuration
loglevel=silly

; Script configurations
ignore-scripts=false
scripts-prepend-node-path=auto

; Save configurations
save-exact=true
save-prefix=~

; Package settings
package-lock=true
; Ignore specific packages
legacy-peer-deps=true

; Installation settings
strict-ssl=false
production=false

; Security settings
audit=true
audit-level=high

; Cache and timeout configurations
cache-lock=true
cache-lock-stale=600
cache-lock-retries=10

; Preference settings
prefer-offline=false
prefer-online=true

; Public hoist patterns
public-hoist-pattern[]=*types*
public-hoist-pattern[]=!@types/react

; Scoped settings for @my-scope packages
@my-scope:registry=https://my-custom-registry.com/
@my-scope:always-auth=true

; Custom settings
[custom]
myvalue=true

    `;
    await writeFiles({ [filename]: storedData });
    const project = new Project(null, {
      name: 'testing',
    });
    const iniData = { data: 'some data' };
    const file = new IniFile(
      project,
      {
        basename: filename,
        readOnInit: false,
      },
      iniData,
    );
    // When
    await file.read({ useLoadedDataAsDefault: true });
    await file.write();
    // Then
    expect(await readStringFile(filename)).toMatchSnapshot();
  });
  it('reads from filesystem during initialization', async () => {
    // Given
    const storedData = 'data=initial data';
    await writeFiles({ 'test2.txt': storedData });
    const project = new Project(null, {
      name: 'testing',
    });
    // When
    const file = new IniFile(
      project,
      {
        basename: 'test2.txt',
      },
      { data: 'some data' },
    );
    // Then
    expect(file.loadedData).toMatchObject({
      data: 'initial data',
    });
  });
  it('can disable reading from filesystem during initialization', async () => {
    // Given
    const storedData = 'initial data';
    await writeStringFile('test2.txt', storedData);
    const project = new Project(null, {
      name: 'testing',
    });
    // When
    const file = new IniFile(
      project,
      {
        basename: 'test2.txt',
        readOnInit: false,
      },
      'some data',
    );
    // Then
    expect(file.loadedData).toBeUndefined();
  });
});
