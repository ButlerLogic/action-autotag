import fs from 'fs';
import path from 'path';
import { workspace } from './envs';

type PackageJson = {
  version: string;
}

export default class Package {
  private readonly data: PackageJson;

  constructor(root = './') {
    root = path.join(workspace(), root);

    if (fs.statSync(root).isDirectory()) {
      root = path.join(root, 'package.json');
    }

    if (!fs.existsSync(root)) {
      throw new Error(`package.json does not exist at ${root}.`);
    }

    const packageContent = fs.readFileSync(root);

    this.data = JSON.parse(packageContent.toString()) as PackageJson;
  }

  get version() {
    return this.data.version;
  }
}
