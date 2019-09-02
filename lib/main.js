// import * as core from '@actions/core';
const core = require('@actions/core')
const fs = require('fs')
const path = require('path')

async function run() {
  try {
    // const myInput = core.getInput('myInput')
    // core.debug(`Hello ${myInput}`)
    let dir = fs.readdirSync(path.resolve(process.env.GITHUB_WORKSPACE), { withFileTypes: true }).map(entry => {
      return `${entry.isDirectory() ? '> ' : '  - '}${entry.name}`
    }).join('\n')

    core.warning(`Working Directory: ${process.env.GITHUB_WORKSPACE}:\n${dir}`)
    core.warning(`Available environment variables:\n -> ${Object.keys(process.env).join('\n -> ')}`)

    core.setOutput('tag', '')
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
