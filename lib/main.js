// import * as core from '@actions/core';
const github = require('@actions/github')
const core = require('@actions/core')
const fs = require('fs')
const path = require('path')

async function run() {
  try {
    // const myToken = core.getInput('myToken');
    // const octokit = new github.GitHub(myToken)
    // const myInput = core.getInput('myInput')
    // core.debug(`Hello ${myInput}`)
    core.warning(process.env.INPUT_GITHUB_TOKEN)
    let dir = fs.readdirSync(path.resolve(process.env.GITHUB_WORKSPACE), { withFileTypes: true }).map(entry => {
      return `${entry.isDirectory() ? '> ' : '  - '}${entry.name}`
    }).join('\n')

    core.warning(` Working Directory: ${process.env.GITHUB_WORKSPACE}:\n${dir}`)
    
    let dir2 = fs.readdirSync(path.resolve(process.env.RUNNER_BASEPATH), { withFileTypes: true }).map(entry => {
      return `${entry.isDirectory() ? '> ' : '  - '}${entry.name}`
    }).join('\n')

    core.warning(` Alt Working Directory: ${process.env.RUNNER_BASEPATH}:\n${dir2}`)
    
    core.warning(` Available environment variables:\n -> ${Object.keys(process.env).map(i => i + ' :: ' +process.env[i]).join('\n -> ')}`)

    console.log(fs.readFileSync(path.join(process.env.GITHUB_WORKSPACE, 'package.json')).toString())

    core.setOutput('tag', '')
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
