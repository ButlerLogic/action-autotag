// import * as core from '@actions/core';
const github = require('@actions/github')
const core = require('@actions/core')
const exec = require('@actions/exec')
const io = require('@actions/io')
const fs = require('fs')
const path = require('path')

async function run() {
  try {
    const gitpath = await io.which('git', true)
    await exec.exec(`"${gitpath}"`, ['fetch'])
    await exec.exec(`"${gitpath}"`, ['checkout', process.env.GITHUB_SHA])
    // await exec.exec(`git fetch && git checkout ${process.env.GITHUB_SHA}`)
    // const myToken = core.getInput('myToken');
    const git = new github.GitHub(process.env.INPUT_GITHUB_TOKEN)
    core.warning(` Available environment variables:\n -> ${Object.keys(process.env).map(i => i + ' :: ' + process.env[i]).join('\n -> ')}`)

    let dir = fs.readdirSync(path.resolve(process.env.GITHUB_WORKSPACE), { withFileTypes: true }).map(entry => {
      return `${entry.isDirectory() ? '> ' : '  - '}${entry.name}`
    }).join('\n')

    core.warning(` Working Directory: ${process.env.GITHUB_WORKSPACE}:\n${dir}`)
    
    // let dir2 = fs.readdirSync(process.env.RUNNER_WORKSPACE, { withFileTypes: true }).map(entry => {
    //   return `${entry.isDirectory() ? '> ' : '  - '}${entry.name}`
    // }).join('\n')

    // core.warning(` Alt Working Directory: ${process.env.RUNNER_WORKSPACE}:\n${dir2}`)
    
    let pkg = require(fs.readFileSync(path.join(process.env.GITHUB_WORKSPACE, 'package.json')))

    core.warning(` ${pkg.version}`)

  git.

    core.setOutput('tag', '')
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
