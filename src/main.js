import * as core from '@actions/core'
import os from 'os'
import semver from 'semver'
import Setup from './lib/setup.js'
import Package from './lib/package.js'
import Tag from './lib/tag.js'
import Regex from './lib/regex.js'
import Dockerfile from './lib/docker.js'

async function run () {
  try {
    Setup.debug()
    Setup.requireAnyEnv('GITHUB_TOKEN', 'INPUT_GITHUB_TOKEN')

    // Configure the default output
    core.setOutput('tagcreated', 'no')

    // Identify the tag parsing strategy
    // Use manual strategy if a version is supplied in the action config
    const versionSupplied = core.getInput('root', { required: false }) !== null && core.getInput('root', { required: false }) !== undefined && core.getInput('root', { required: false }).trim().length > 0
    const strategy = versionSupplied ? 'manual' : (core.getInput('regex_pattern', { required: false }) || '').trim().length > 0 ? 'regex' : ((core.getInput('strategy', { required: false }) || 'package').trim().toLowerCase())

    // Identify the root directory to use for auto-identifying a tag version
    const root = core.getInput('root', { required: false }) || core.getInput('package_root', { required: false }) || (strategy === 'composer' ? './composer.json' : './')

    // If this value is true, the tag will not be pushed
    const isDryRun = (core.getInput('dry_run', { required: false }) || '').trim().toLowerCase() === 'true'

    // Extract the version number using the supplied strategy
    let version = core.getInput('root', { required: false })
    version = version === null || version.trim().length === v0 ? null : version

    // If Regex strategy is specified, retrieve the Regex pattern
    const pattern = core.getInput('regex_pattern', { required: false })

    // Identify the version by strategy
    switch (strategy) {
      case 'docker':
        version = (new Dockerfile(root)).version
        break

      case 'composer':
      case 'package':
        // Extract using the package strategy (this is the default strategy)
        version = (new Package(root)).version
        break

      case 'regex':
        version = (new Regex(root, new RegExp(pattern, 'gim'))).version
        break

      case 'manual':
        core.notice(`"${version}" version was manually specified in the action configuration`)
        break

      default:
        core.setFailed(`"${strategy}" is not a recognized tagging strategy. Choose from: 'package' (package.json), 'composer' (composer.json), 'docker' (uses Dockerfile), or 'regex' (JS-based RegExp). Specify a version to use the "manual" strategy.`)
        return
    }

    const msg = ` using the ${strategy} extraction${strategy === 'regex' ? ' with the /' + pattern + '/gim pattern.' : ''}.`

    if (!version) {
      throw new Error(`No version identified${msg}`)
    }

    // Ensure that version and minVersion are valid SemVer strings
    const minVersion = core.getInput('min_version', { required: false })
    const versionSemVer = semver.coerce(version)
    const minVersionSemVer = semver.coerce(minVersion)

    if (!minVersionSemVer) {
      core.info(`Skipping min version check. ${minVersion} is not valid SemVer`)
    }

    if(!versionSemVer) {
      core.info(`Skipping min version check. ${version} is not valid SemVer`)
    }

    if (minVersionSemVer && versionSemVer && semver.lt(versionSemVer, minVersionSemVer)) {
      core.info(`Version "${version}" is lower than minimum "${minVersion}"`)
      return
    }

    core.notice(`Recognized "${version}"${msg}`)
    core.setOutput('version', version)
    core.debug(` Detected version ${version}`)

    // Configure a tag using the identified version
    const tag = new Tag(
      core.getInput('tag_prefix', { required: false }),
      version,
      core.getInput('tag_suffix', { required: false })
    )

    if (isDryRun) {
      core.notice(`"${tag.name}" tag was not pushed because the dry_run option was set.`)
    } else {
      core.info(`Attempting to create ${tag.name} tag.`)
    }

    core.setOutput('tagrequested', tag.name)
    core.setOutput('prerelease', tag.prerelease ? 'yes' : 'no')
    core.setOutput('build', tag.build ? 'yes' : 'no')

    // Check for existance of tag and abort (short circuit) if it already exists.
    if (await tag.exists()) {
      core.setFailed(`"${tag.name}" tag already exists.` + os.EOL)
      core.setOutput('tagname', '')
      return
    }

    // The tag setter will autocorrect the message if necessary.
    tag.message = core.getInput('tag_message', { required: false }).trim()

    if (!isDryRun) {
      await tag.push()
      core.setOutput('tagcreated', 'yes')
    }

    core.setOutput('tagname', tag.name)
    core.setOutput('tagsha', tag.sha)
    core.setOutput('taguri', tag.uri)
    core.setOutput('tagmessage', tag.message)
    core.setOutput('tagref', tag.ref)
  } catch (error) {
    core.warning(error.message + '\n' + error.stack)
    core.setOutput('tagname', '')
    core.setOutput('tagsha', '')
    core.setOutput('taguri', '')
    core.setOutput('tagmessage', '')
    core.setOutput('tagref', '')
    core.setOutput('tagcreated', 'no')
  }
}

run()
