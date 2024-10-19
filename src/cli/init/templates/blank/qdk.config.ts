import * as qdk from 'qdk';

export default class MyApp extends qdk.QdkApp {
  constructor({ cwd }: { cwd: string }) {
    super();

    // Create a new empty project
    this.add(
      qdk.Project.create({
        name: 'qdk-sample',
        description: 'Sample QDK Project',
        version: '0.1.0',
        cwd,
      }),
    );

    // do something with your project
  }
}
