const core = require('@actions/core')
const github = require('@actions/github')
const globby = require('globby')
const fs = require('fs')
const path = require('path')
const execSync = require('child_process').execSync
const NpmRegistry = require('./npm.js')

async function run() {
  try {
    core.debug(
      ` Available environment variables:\n -> ${Object.keys(process.env)
        .map(i => i + ' :: ' + process.env[i])
        .join('\n -> ')}`
    )

    if (!process.env.hasOwnProperty('REGISTRY_TOKEN')) {
      core.setFailed('Missing registry token.')
      return
    }

    const force = core.getInput('force') || false
    const scan = (core.getInput('scan', { required: false }) || "'./'").split(',').map(dir => `${dir.trim()}/**/package.json`)
    const npm = new NpmRegistry(process.env.REGISTRY_TOKEN, core.getInput('registry', { required: false }))

    // Scan for modules
    const paths = await globby(scan.concat(['!node_modules', '!.*']))
console.log('-->', paths)
    if (paths.length === 0) {
      console.log('No modules detected.')
      return
    }

    paths.forEach(file => {
      file = path.resolve(file)

      try {
        const content = JSON.parse(fs.readFileSync(file))

        // Do not publish private packages unless forced
        if (!content.private || force) {
          console.log(npm.npmrc('./'))
        }
      } catch (e) {
        core.warning(error.message)
      }
    })
  } catch (error) {
    core.warning(error.message)
    return
  }
}

run()
