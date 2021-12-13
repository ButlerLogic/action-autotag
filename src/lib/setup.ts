import core from '@actions/core';
import fs from 'fs';
import path from 'path';
import { workspace } from './envs';

export default class Setup {
  static debug() {
    // Metadate for debugging
    core.debug(
      ` Available environment variables:\n -> ${Object.keys(process.env)
        .map(i => i + ' :: ' + process.env[i])
        .join('\n -> ')}`
    );

    const dir = fs
      .readdirSync(path.resolve(workspace()), { withFileTypes: true })
      .map(entry => {
        return `${entry.isDirectory() ? '> ' : '  - '}${entry.name}`;
      })
      .join('\n');

    core.debug(` Working Directory: ${process.env.GITHUB_WORKSPACE}:\n${dir}`);
  }

  static requireAnyEnv() {
    if (!process.env.GITHUB_TOKEN)
      throw new Error('The following environment variables is required: GITHUB_TOKEN');
  }
}
