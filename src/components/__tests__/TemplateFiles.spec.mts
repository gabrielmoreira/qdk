import { resetFilesystem, toSnapshot } from '#test/helpers.mjs';
import { describe, expect, it, vi } from 'vitest';
import { Project, TemplateFiles } from '../../index.mjs';

vi.mock('node:fs');
vi.mock('node:fs/promises');

describe('components/TemplateFiles', () => {
  it('', async () => {
    // Given
    // ... filesystem has some templates
    resetFilesystem({
      json: {
        '/tmp/template-files/templates/hello.js.eta':
          'export const hello = "<%= it.name %>"',
        '/tmp/template-files/templates/some/directory/world.js.eta':
          'export const world = "<%= it.name %>"',
      },
    });
    // ... a new project located at '/tmp/template-files/project'
    const testProject = Project.create({
      name: 'template-files',
      cwd: '/tmp/template-files/project',
    });
    // ... and templates configured at '/tmp/template-files/templates/'
    new TemplateFiles(
      testProject,
      {
        templatePath: '/tmp/template-files/templates/',
      },
      // and some dafault data
      { name: 'Gabriel' },
    );

    // When
    await testProject.synth();

    // Then
    expect(toSnapshot()).toMatchSnapshot();
  });
});
