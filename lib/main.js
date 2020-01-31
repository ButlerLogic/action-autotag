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
      core.setFailed('Missing REGISTRY_TOKEN.')
      return
    }

    const token = process.env.REGISTRY_TOKEN
    const force = (core.getInput('force', { required: false }) || 'false').trim().toLowerCase() === 'true' ? true : false
    const scan = (core.getInput('scan', { required: false }) || './').split(',').map(dir => path.join(process.env.GITHUB_WORKSPACE, dir.trim(), '/**/package.json'))
    const ignore = new Set()
    const ignoreList = core.getInput('ignore', { required: false }).trim().split(',')
    
    if (ignoreList.length > 0) {
      (await globby(
        ignoreList
          .filter(dir => dir.trim().length > 0)
          .map(dir => path.join(process.env.GITHUB_WORKSPACE, dir.trim(), '/**/package.json'))
      ))
      .forEach(result => ignore.add(result))
    }

    console.log(`Directories to scan:\n\t- ${scan.join('\n\t- ')}`)

    const npm = new NpmRegistry(token, core.getInput('registry', { required: false }))

    // Scan for modules
    const test = await globby(scan.concat(['!**/node_modules']))
    const paths = new Set(await globby(scan.concat(['!**/node_modules'])))

    // Remove ignored directories
    if (ignore.size > 0) {
      core.debug('Ignored:', ignore)
      ignore.forEach(file => paths.has(file) && paths.delete(file))
    }

    if (paths.size === 0) {
      core.debug('Paths:\n' + Array.from(paths).join('\n'))
      core.setFailed('No modules detected in the code base (could not find package.json).')
      return
    }

    let publications = new Set()

    paths.forEach(file => {
      file = path.resolve(file)
      console.log(`Attempting to publish from "${file}"`)
      const content = JSON.parse(fs.readFileSync(file))

      // Do not publish private packages unless forced
      if (force === true || !content.private) {
        try {
          npm.publish(path.dirname(file), force === true ? true : !content.private)
          publications.add(`${content.name}@${content.version}`)
        } catch (e) {
          core.warning(e.message)
        }
      } else {
        core.warning(`Skipped publishing ${path.dirname(file)} to ${npm.registry} (private module).`)
      }
    })

    if (publications.size === 0) {
      core.setFailed('Did not successfully publish any modules.')
      return
    }

    core.setOutput('modules', Array.from(publications).join(', '))
  } catch (e) {
    core.setFailed(e.message)
  }
}

run()
