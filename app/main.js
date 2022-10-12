import core from '@actions/core'
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
    const root = core.getInput('root', { required: false }) || core.getInput('package_root', { required: false }) || './'
    const strategy = (core.getInput('regex_pattern', { required: false }) || '').trim().length > 0 ? 'regex' : ((core.getInput('strategy', { required: false }) || 'package').trim().toLowerCase())

    // If this value is true, the tag will not be pushed
    const isDryRun = core.getInput('dry_run', { required: false });

    // Extract the version number using the supplied strategy
    let version = core.getInput('root', { required: false })
    version = version === null || version.trim().length === 0 ? null : version
    const pattern = core.getInput('regex_pattern', { required: false })

    switch (strategy) {
      case 'docker':
        version = (new Dockerfile(root)).version
        break

      case 'package':
        // Extract using the package strategy (this is the default strategy)
        version = (new Package(root)).version
        break

      case 'regex':
        version = (new Regex(root, new RegExp(pattern, 'gim'))).version
        break

      default:
        core.setFailed(`"${strategy}" is not a recognized tagging strategy. Choose from: 'package' (package.json), 'docker' (uses Dockerfile), or 'regex' (JS-based RegExp).`)
        return
    }

    const msg = ` using the ${strategy} extraction${strategy === 'regex' ? ' with the /' + pattern + '/gim pattern.' : ''}.`

    if (!version) {
      throw new Error(`No version identified${msg}`)
    }

    const minVersion = core.getInput('min_version', { required: false })
    
    // Ensure that version and minVersion are valid SemVer strings
    const minVersionSemVer = semver.coerce(minVersion)
    const versionSemVer = semver.coerce(version)
    if (!minVersionSemVer) {
      core.warning(`Skipping min version check. ${minVersion} is not valid SemVer`)
    }
    if(!versionSemVer) {
      core.warning(`Skipping min version check. ${version} is not valid SemVer`)
    }
    
    if (minVersionSemVer && versionSemVer && semver.lt(versionSemVer, minVersionSemVer)) {
      core.warning(`Version "${version}" is lower than minimum "${minVersion}"`)
      return
    }

    core.warning(`Recognized "${version}"${msg}`)
    core.setOutput('version', version)
    core.debug(` Detected version ${version}`)

    // Configure a tag using the identified version
    const tag = new Tag(
      core.getInput('tag_prefix', { required: false }),
      version,
      core.getInput('tag_suffix', { required: false })
    )

    if (isDryRun === "true") {
      core.warning(`"${tag.name}" tag is not pushed because the dry_run option was set.`)
    } else {
      core.warning(`Attempting to create ${tag.name} tag.`)
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

    if (isDryRun !== "true") {
      await tag.push()
    }
    core.setOutput('tagname', tag.name)
    core.setOutput('tagsha', tag.sha)
    core.setOutput('taguri', tag.uri)
    core.setOutput('tagmessage', tag.message)
    core.setOutput('tagref', tag.ref)
    core.setOutput('tagcreated', 'yes')
  } catch (error) {
    core.warning(error.message)
    core.warning(error.stack)
    core.setOutput('tagname', '')
    core.setOutput('tagsha', '')
    core.setOutput('taguri', '')
    core.setOutput('tagmessage', '')
    core.setOutput('tagref', '')
    core.setOutput('tagcreated', 'no')
  }
}

run()
