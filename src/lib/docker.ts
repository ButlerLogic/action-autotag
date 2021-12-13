import fs from 'fs';
import path from 'path';
import { workspace } from './envs.js';
import Regex from './regex.js';

export default class Dockerfile extends Regex {
  constructor(root = '') {
    root = path.join(workspace(), root ?? '');

    if (fs.statSync(root).isDirectory()) {
      root = path.join(root, 'Dockerfile');
    }

    super(root, /LABEL[\s\t]+version=[\t\s+]?["']?([0-9.]+)["']?/i);
  }
}
