// import * as core from '@actions/core';
const github = require('@actions/github')
const core = require('@actions/core')
const fs = require('fs')
const path = require('path')

async function run() {
  try {
    const git = new github.GitHub(process.env.INPUT_GITHUB_TOKEN)
    core.warning(` Available environment variables:\n -> ${Object.keys(process.env).map(i => i + ' :: ' + process.env[i]).join('\n -> ')}`)

    let dir = fs.readdirSync(path.resolve(process.env.GITHUB_WORKSPACE), { withFileTypes: true }).map(entry => {
      return `${entry.isDirectory() ? '> ' : '  - '}${entry.name}`
    }).join('\n')

    core.warning(` Working Directory: ${process.env.GITHUB_WORKSPACE}:\n${dir}`)
    
    let pkg = require(path.join(process.env.GITHUB_WORKSPACE, 'package.json'))

    core.warning(` ${pkg.version}`)

  git.

    core.setOutput('tag', '')
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
