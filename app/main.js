import core from '@actions/core'
import os from 'os'
import Setup from './lib/setup.js'
import Package from './lib/package.js'
import Tag from './lib/tag.js'
import Regex from './lib/regex.js'

async function run () {
  try {
    Setup.debug()
    Setup.requireAnyEnv('GITHUB_TOKEN', 'INPUT_GITHUB_TOKEN')

    // Identify the tag parsing strategy
    const root = core.getInput('root', { required: false }) || core.getInput('package_root', { required: false }) || './'
    const strategy = (core.getInput('strategy', { required: false }) || '').trim().length > 0 ? 'regex' : ((core.getInput('strategy', { required: false }) || 'package').trim().toLowerCase())

    // Extract the version number using the supplied strategy
    let version = core.getInput('root', { required: false })
    version = version === null || version.trim().length === 0 ? null : version

    switch (strategy) {
      case 'docker':
        version = (new Dockerfile(root)).version
        break

      case 'package':
        // Extract using the package strategy (this is the default strategy)
        version = (new Package(root)).version
        break

      case 'regex':
        version = (new Regex(root, new RegExp(pattern, 'i'))).version
        break

      default:
        core.setFailed(`"${strategy}" is not a recognized tagging strategy. Choose from: 'package' (package.json), 'docker' (uses Dockerfile), or 'regex' (JS-based RegExp).`)
        return
    }

    core.setOutput('version', version)
    core.debug(` Detected version ${version}`)

    // Configure a tag using the identified version
    const tag = new Tag(
      core.getInput('tag_prefix', { required: false }),
      version,
      core.getInput('tag_suffix', { required: false })
    )

    // Check for existance of tag and abort (short circuit) if it already exists.
    if (await tag.exists()) {
      core.warning(`"${tag.name}" tag already exists.` + os.EOL)
      core.setOutput('tagname', '')
      core.setOutput('tagcreated', 'no')
      return
    }

    // The tag setter will autocorrect the message if necessary.
    tag.message = core.getInput('tag_message', { required: false }).trim()
    await tag.push()
  } catch (error) {
    core.warning(error.message)
    core.setOutput('tagname', '')
    core.setOutput('tagsha', '')
    core.setOutput('taguri', '')
    core.setOutput('tagmessage', '')
    core.setOutput('tagref', '')
    core.setOutput('tagcreated', 'no')
  }
}

run()