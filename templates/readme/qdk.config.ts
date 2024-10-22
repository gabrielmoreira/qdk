import * as qdk from 'qdk';

export default class MyApp extends qdk.QdkApp {
  constructor(options: qdk.QdkAppOptions) {
    super(options);

    // Initialize a new project with basic information
    const project = new qdk.Project(this, {
      name: 'qdk-sample',
      description: 'Sample QDK Project',
      version: '0.1.0',
    });

    // Add .gitignore to the project
    new qdk.Gitignore(project);

    // Attach a package manager to the project
    new qdk.NpmPackageManager(project);
    // If you prefer pnpm, use the line below:
    // new qdk.PnpmPackageManager(project);

    // Add a package.json to the project (it uses project name, description, and version)
    new qdk.PackageJson(project, {
      license: 'MIT',
    })
      .addDevDeps('vitest')
      .setScript('test', 'vitest');

    // Optionally create sample files for the project (created once, but never updated)
    new qdk.SampleFiles(project, {
      files: {
        'README.md':
          'Use npx qdk synth to synthetize this project configurations',
      },
    });

    // Create a managed file (this file will be updated whenever 'qdk synth' is run)
    new qdk.TextFile(
      project,
      {
        basename: '.editorconfig',
      },
      // qdk.dedent helps you strips indentation from multi-line strings.
      qdk.dedent`
        root = true

        [*]
        charset = utf-8
        end_of_line = lf
        insert_final_newline = true
        indent_style = space
        indent_size = 2
        trim_trailing_whitespace = true
    `,
    );
  }
}
