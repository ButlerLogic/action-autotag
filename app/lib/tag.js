import core from '@actions/core'
import os from 'os'
import GitHub from '@actions/github'

// Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
const github = new GitHub(process.env.GITHUB_TOKEN || process.env.INPUT_GITHUB_TOKEN)
const context = github.context
// Get owner and repo from context of payload that triggered the action
const { owner, repo } = context.repo

export default class Tag {
  constructor (prefix, version, postfix) {
    this.prefix = prefix
    this.version = version
    this.postfix = postfix
    this._tags = null
    this._message = null
    this._exists = null
  }

  get name () {
    return `${this.prefix.trim()}${this.version.trim()}${this.postfix.trim()}`
  }

  set message (value) {
    if (value && value.length > 0) {
      this._message = value
    }
  }

  async getMessage () {
    if (this._message !== null) {
      return this._message
    }

    try {
      const changelog = await github.repos.compareCommits({ owner, repo, base: tags.data.shift().name, head: 'master' })

      return changelog.data.commits
        .map(
          (commit, i) =>
            `${i + 1}) ${commit.commit.message}${
              commit.hasOwnProperty('author')
                ? commit.author.hasOwnProperty('login')
                  ? ' (' + commit.author.login + ')'
                  : ''
                : ''
            }\n(SHA: ${commit.sha})\n`
        )
        .join('\n')
    } catch (e) {
      core.warning('Failed to generate changelog from commits: ' + e.message + os.EOL)
      return `Version ${this.version}`
    }
  }

  async getTags () {
    if (this._tags !== null) {
      return this._tags.data
    }

    this._tags = await github.repos.listTags({ owner, repo, per_page: 100 })

    return this._tags.data
  }

  async exists () {
    if (this._exists !== null) {
      return this._exists
    }
    const currentTag = this.name
    const tags = await this.getTags()

    for (const tag of tags) {
      if (tag.name === currentTag) {
        this._exists = true
        return true
      }
    }

    this._exists = false
    return false
  }

  async push () {
    let tagexists = await this.exists()

    if (!tagexists) {
      // Create tag
      const newTag = await github.git.createTag({
        owner,
        repo,
        tag: this.name,
        message: this.message,
        object: process.env.GITHUB_SHA,
        type: 'commit'
      })

      core.warning(`Created new tag: ${newTag.data.tag}`)

      // Create reference
      let newReference
      try {
        newReference = await github.git.createRef({
          owner,
          repo,
          ref: `refs/tags/${newTag.data.tag}`,
          sha: newTag.data.sha
        })
      } catch (e) {
        core.warning({
          owner,
          repo,
          ref: `refs/tags/${newTag.data.tag}`,
          sha: newTag.data.sha
        })

        throw e
      }

      core.warning(`Reference ${newReference.data.ref} available at ${newReference.data.url}` + os.EOL)

      // Store values for other actions
      if (typeof newTag === 'object' && typeof newReference === 'object') {
        core.setOutput('tagname', this.name)
        core.setOutput('tagsha', newTag.data.sha)
        core.setOutput('taguri', newReference.data.url)
        core.setOutput('tagmessage', this.message)
        core.setOutput('tagref', newReference.data.ref)
        core.setOutput('tagcreated', 'yes')
      }
    } else {
      core.warning('Cannot push tag (it already exists).')
    }
  }
}
