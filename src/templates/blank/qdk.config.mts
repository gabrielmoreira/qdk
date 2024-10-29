import * as qdk from '../../index.mjs';

export default class MyApp extends qdk.QdkApp {
  constructor(options: qdk.QdkAppOptions) {
    super(options);

    // Initialize a new project with basic information
    new qdk.Project(this, {
      name: 'qdk-sample',
      description: 'Sample QDK Project',
      version: '0.1.0',
    });

    // Add .gitignore to the project
    // new qdk.Gitignore(project);

    // Use npm package manager
    // new qdk.NpmPackageManager(project);

    // Use pnpm package manager
    // new qdk.PnpmPackageManager(project);

    // Customize package.json
    // new qdk.PackageJson(project);

    // Add typescript
    // new qdk.Typescript(project);
  }
}
