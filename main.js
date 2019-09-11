const github = require('@actions/github')
const core = require('@actions/core')
const path = require('path')
const fs = require('fs')

async function run() {
  try {
    let fileName = core.getInput('source_file')
    let filePath = path.join(process.env.GITHUB_WORKSPACE, fileName)
    if (!fs.existsSync(filePath))
      return core.setFailed(`source file ${fileName} does not exist.`)

    let content = fs.readFileSync(filePath)
    let regex = new RegExp(core.getInput('extraction_regex'))
    let matches = content.match(regex)
    if (!matches)
      return core.setFailed(`no match was found for the regex '${regex.toString()}'.`)

    let version = matches[matches.length - 1]
    core.setOutput('version', version)

    if (!process.env.hasOwnProperty('INPUT_GITHUB_TOKEN') || process.env.INPUT_GITHUB_TOKEN.trim().length === 0)
      return core.setFailed('Invalid or missing GITHUB_TOKEN.')

    let git = new github.GitHub(process.env.INPUT_GITHUB_TOKEN)
    let repo = process.env.GITHUB_REPOSITORY.split('/').pop()
    let owner = process.env.GITHUB_ACTOR

    let tags
    try {
      tags = await git.repos.listTags({owner, repo, per_page: 100})
    } catch (e) {
      tags = {}
    }

    for (let tag of tags.data) {
      if (tag.name.trim().toLowerCase() === version.trim().toLowerCase()) {
        core.warning(`"${tag.name.trim()}" tag already exists.`)
        core.setOutput('tagname', '')
        return
      }
    }

    let format = core.getInput('tag_format', { required: false }).trim()
    let message = core.getInput('tag_message', { required: false }).trim()
    let name = format.replace('{version}', version)

    if (message.length === 0 && tags.data.length > 0) {
      try {
        let latest = tags.data.shift()
        let changelog = await git.repos.compareCommits({owner, repo, base: latest.name, head: 'master'})

        message = changelog.data.commits.map(commit => `**1) ${commit.commit.message}**${commit.hasOwnProperty('author') ? (commit.author.hasOwnProperty('login') ? ' (' + commit.author.login + ')' : '') : ''}\n(SHA: ${commit.sha})\n`).join('\n').trim()
      } catch (e) {
        return core.setFailed(e.message)
      }
    }

    let tag
    try {
      message = message.length > 0 ? message : `Version ${version}`
      tag = await git.git.createTag({owner, repo, tag: name, message: message, object: process.env.GITHUB_SHA, type: 'commit'})
    } catch (e) {
      return core.setFailed(e.message)
    }

    let reference
    try {
      reference = await git.git.createRef({owner, repo, ref: `refs/tags/${newTag.data.tag}`, sha: newTag.data.sha})
      core.warning(`Reference ${reference.data.ref} available at ${reference.data.url}`)
    } catch (e) {
      core.warning({owner, repo, ref: `refs/tags/${newTag.data.tag}`, sha: newTag.data.sha})
      core.setFailed(e.message)
      return
    }

    if (typeof newTag === 'object' && typeof reference === 'object') {
      core.setOutput('tagname', name)
      core.setOutput('tagsha', tag.data.sha)
      core.setOutput('taguri', reference.data.url)
      core.setOutput('tagmessage', message)
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
