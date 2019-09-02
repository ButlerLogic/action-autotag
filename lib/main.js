// import * as core from '@actions/core';
const core = require('@actions/core')

async function run() {
  console.log(process.env)

  try {
    const myInput = core.getInput('myInput')
    core.debug(`Hello ${myInput}`)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
