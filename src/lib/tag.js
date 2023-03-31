import core from '@actions/core'
import os from 'os'
import { Octokit } from 'octokit'

// Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
const github = (new Octokit({ auth: process.env.GITHUB_TOKEN || process.env.INPUT_GITHUB_TOKEN })).rest

// Get owner and repo from context of payload that triggered the action
const [ owner, repo ] = process.env.GITHUB_ACTION_REPOSITORY.split('/')

export default class Tag {
  constructor (prefix, version, postfix) {
    this.prefix = prefix
    this.version = version
    this.postfix = postfix
    this._tags = null
    this._message = null
    this._exists = null
    this._sha = ''
    this._uri = ''
    this._ref = ''
  }

  get name () {
    return `${this.prefix.trim()}${this.version.trim()}${this.postfix.trim()}`
  }

  set message (value) {
    if (value && value.length > 0) {
      this._message = value
    }
  }

  get message() {
    return this._message || ''
  }

  get sha () {
    return this._sha || ''
  }

  get uri () {
    return this._uri || ''
  }

  get ref () {
    return this._ref || ''
  }

  get prerelease () {
    return /([0-9\.]{5}(-[\w\.0-9]+)?)/i.test(this.version)
  }

  get build () {
    return /([0-9\.]{5}(\+[\w\.0-9]+)?)/i.test(this.version)
  }

  async getMessage () {
    if (this._message !== null) {
      return this._message
    }

    try {
      let tags = await this.getTags()

      if (tags.length === 0) {
        return `Version ${this.version}`
      }

      const changelog = await github.repos.compareCommits({ owner, repo, base: tags.shift().name, head: process.env.GITHUB_HEAD_REF ?? 'main' })

      const tpl = (core.getInput('commit_message_template', { required: false }) || '').trim()

      return changelog.data.commits
        .map(
          (commit, i) => {
            if (tpl.length > 0) {
              return tpl
                .replace(/\{\{\s?(number)\s?\}\}/gi, i + 1)
                .replace(/\{\{\s?(message)\s?\}\}/gi, commit.commit.message)
                .replace(/\{\{\s?(author)\s?\}\}/gi, commit.hasOwnProperty('author') ? (commit.author.hasOwnProperty('login') ? commit.author.login : '') : '')
                .replace(/\{\{\s?(sha)\s?\}\}/gi, commit.sha)
                .trim() + '\n'
            } else {
              return `${i === 0 ? '\n' : ''}${i + 1}) ${commit.commit.message}${
                commit.hasOwnProperty('author')
                  ? commit.author.hasOwnProperty('login')
                    ? ' (' + commit.author.login + ')'
                    : ''
                  : ''
              }\n(SHA: ${commit.sha})\n`
            }
          })
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
      const message = await this.getMessage()
      const newTag = await github.git.createTag({
        owner,
        repo,
        tag: this.name,
        message,
        object: process.env.GITHUB_SHA,
        type: 'commit'
      })

      this._sha = newTag.data.sha
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

      this._uri = newReference.data.url
      this._ref = newReference.data.ref
      this._message = message;

      core.warning(`Reference ${newReference.data.ref} available at ${newReference.data.url}` + os.EOL)
    } else {
      core.warning('Cannot push tag (it already exists).')
    }
  }
}
