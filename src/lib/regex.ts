import fs from 'fs';
import path from 'path';

export default class Regex {
  private readonly content: string;
  public readonly version: string | null;

  constructor(root = './', pattern: RegExp) {
    root = path.resolve(root);

    if (fs.statSync(root).isDirectory()) {
      throw new Error(`${root} is a directory. The Regex tag identification strategy requires a file.`);
    }

    if (!fs.existsSync(root)) {
      throw new Error(`"${root}" does not exist.`);
    }

    this.content = fs.readFileSync(root).toString();

    const patternContent = pattern.exec(this.content);
    if (!patternContent) {
      this.version = null;
      // throw new Error(`Could not find pattern matching "${pattern.toString()}" in "${root}".`)
    } else if (patternContent.groups && patternContent.groups.version) {
      this.version = patternContent.groups.version;
    } else {
      this.version = patternContent[1];
    }
  }

  get versionFound() {
    return this.version !== null;
  }
}
