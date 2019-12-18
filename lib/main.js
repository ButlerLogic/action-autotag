// import * as core from '@actions/core';
const github = require('@actions/github')
const core = require('@actions/core')
const fs = require('fs')
const path = require('path')

async function run() {
  try {
    core.debug(` Available environment variables:\n -> ${Object.keys(process.env).map(i => i + ' :: ' + process.env[i]).join('\n -> ')}`)

    let version = ""

    if (!process.env.hasOwnProperty('INPUT_VERSION') || process.env.INPUT_VERSION.trim().length === 0) {
      let dir = fs.readdirSync(path.resolve(process.env.GITHUB_WORKSPACE), { withFileTypes: true }).map(entry => {
        return `${entry.isDirectory() ? '> ' : '  - '}${entry.name}`
      }).join('\n')

      core.debug(` Working Directory: ${process.env.GITHUB_WORKSPACE}:\n${dir}`)

      const pkg_root = core.getInput('package_root', { required: false })
      let pkgfile = path.join(process.env.GITHUB_WORKSPACE, pkg_root, 'package.json')

      if (!fs.existsSync(pkgfile)) {
        core.setFailed('package.json does not exist.')
        return
      }

      let pkg = require(pkgfile)
      version = pkg.version
    } else {
      version = process.env.INPUT_VERSION.trim()
    }

    core.setOutput('version', version)
    core.debug(` Detected version ${version}`)

    if (!process.env.hasOwnProperty('INPUT_GITHUB_TOKEN') || process.env.INPUT_GITHUB_TOKEN.trim().length === 0) {
      core.setFailed('Invalid or missing GITHUB_TOKEN.')
      return
    }

    // Check for existing tag
    const git = new github.GitHub(process.env.INPUT_GITHUB_TOKEN)
    const owner = process.env.GITHUB_ACTOR
    const repo = process.env.GITHUB_REPOSITORY.split('/').pop()

    let tags
    try {
      tags = await git.repos.listTags({
        owner,
        repo,
        per_page: 100
      })
    } catch (e) {
      tags = {
        data: []
      }
    }

    // Check for existance of tag and abort (short circuit) if it already exists.
    for (let tag of tags.data) {
      if (tag.name.trim().toLowerCase() === version.trim().toLowerCase()) {
        core.warning(`"${tag.name.trim()}" tag already exists.`)
        core.setOutput('tagname', '')
        return
      }
    }

    // Create the new tag name
    let tagName = version
    const tagPrefix = core.getInput('tag_prefix', { required: false })
    const tagSuffix = core.getInput('tag_suffix', { required: false })
    let tagMsg = core.getInput('tag_message', { required: false }).trim()

    tagName = `${tagPrefix}${tagName}${tagSuffix}`

    if (tagMsg.length === 0 && tags.data.length > 0) {
      try {
        latestTag = tags.data.shift()

        let changelog = await git.repos.compareCommits({
          owner,
          repo,
          base: latestTag.name,
          head: 'master'
        })

        tagMsg = changelog.data.commits.map(commit => `**1) ${commit.commit.message}**${commit.hasOwnProperty('author') ? (commit.author.hasOwnProperty('login') ? ' (' + commit.author.login + ')' : '') : ''}\n(SHA: ${commit.sha})\n`).join('\n')
      } catch (e) {
        core.warning('Failed to generate changelog from commits: ' + e.message)
        tagMsg = `${tagPrefix}${tagName}${tagSuffix}`
      }
    }

    let newTag

    try {
      tagMsg = tagMsg.trim().length > 0
        ? tagMsg
        : `Version ${version}`

      newTag = await git.git.createTag({
        owner,
        repo,
        tag: tagName,
        message: tagMsg,
        object: process.env.GITHUB_SHA,
        type: 'commit'
      })

      core.warning(`Created new tag: ${newTag.data.tag}`)
    } catch (e) {
      core.setFailed(e.message)
      return
    }

    let newReference

    try {
      newReference = await git.git.createRef({
        owner,
        repo,
        ref: `refs/tags/${newTag.data.tag}`,
        sha: newTag.data.sha
      })

      core.warning(`Reference ${newReference.data.ref} available at ${newReference.data.url}`)
    } catch (e) {
      core.warning({
        owner,
        repo,
        ref: `refs/tags/${newTag.data.tag}`,
        sha: newTag.data.sha
      })

      core.setFailed(e.message)
      return
    }

    // Store values for other actions
    if (typeof newTag === 'object' && typeof newReference === 'object') {
      core.setOutput('tagname', tagName)
      core.setOutput('tagsha', newTag.data.sha)
      core.setOutput('taguri', newReference.data.url)
      core.setOutput('tagmessage', tagMsg.trim())
    }
  } catch (error) {
    core.warning(error.message)
    core.setOutput('tagname', '')
    core.setOutput('tagsha', '')
    core.setOutput('taguri', '')
    core.setOutput('tagmessage', '')
  }
}

run()
