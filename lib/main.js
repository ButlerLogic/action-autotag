const core = require('@actions/core')
const github = require('@actions/github')
const globby = require('globby')
const fs = require('fs')
const path = require('path')
const execSync = require('child_process').execSync
const NpmRegistry = require('./npm.js')

async function run() {
  core.debug(
    ` Available environment variables:\n -> ${Object.keys(process.env)
      .map(i => i + ' :: ' + process.env[i])
      .join('\n -> ')}`
  )

  const token = core.getInput('token', { required: true })
  const force = (core.getInput('force', { required: false }) || 'false').trim().toLowerCase() === 'true' ? true : false
  const scan = (core.getInput('scan', { required: false }) || "'./'").split(',').map(dir => `${path.resolve(dir.trim())}/**/package.json`)
  const ignore = new Set(await globby((core.getInput('ignore', { required: false }) || "").split(',').map(dir => `${path.resolve(dir.trim())}/**/package.json`)))
  const npm = new NpmRegistry(token, core.getInput('registry', { required: false }))

  // Scan for modules
  const paths = new Set(await globby(scan.concat(['!**/node_modules'])))

  // Remove ignored directories
  if (ignore.size > 0) {
    ignore.forEach(file => paths.has(file) && paths.delete(file))
  }

  if (paths.length === 0) {
    core.warning('No modules detected in the code base (could not find package.json).')
    return
  }

  let publications = 0

  paths.forEach(file => {
    file = path.resolve(file)
    const content = JSON.parse(fs.readFileSync(file))

    // Do not publish private packages unless forced
    if (force === true || !content.private) {
      try {
        npm.publish(path.dirname(file, force === true ? true : !content.private))
        publications += 1
      } catch (e) {
        core.warning(e.message)
      }
    } else {
      core.warning(`Skipped publishing ${path.dirname(file)} to ${npm.registry} (private module).`)
    }
  })

  if (publications === 0) {
    core.warning('Did not successfully publish any modules.')
  }
}

run()
