import { debug } from '@actions/core';
import fs from 'fs';
import path from 'path';
import { workspace } from './envs';

export const debugVariables = () => {
  // Metadate for debugging
  debug(
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

  debug(` Working Directory: ${process.env.GITHUB_WORKSPACE}:\n${dir}`);
}

export const requireAnyEnv = () => {
  if (!process.env.GITHUB_TOKEN)
    throw new Error('The following environment variables is required: GITHUB_TOKEN');
}

