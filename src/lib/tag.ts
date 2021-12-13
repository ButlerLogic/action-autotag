import * as core from '@actions/core';
import { RestEndpointMethodTypes } from '@octokit/rest';
import { EOL } from 'os';
import { GitHub, repo } from '.';
import { githubSha, headBranch } from './envs';
import { TagData } from './inputs';


export default class Tag {
  private tags?: RestEndpointMethodTypes["repos"]["listTags"]["response"];
  private message?: string;
  private doesExist?: boolean;
  public sha = '';
  public uri = '';
  public ref = '';

  public constructor(private readonly github: GitHub,
    private readonly repoData: repo,
    private readonly version: string,
    private readonly tagData: TagData) {
    if (tagData.message) {
      this.message = tagData.message;
    }
  }

  get name() {
    return `${this.tagData.prefix.trim()}${this.version.trim()}${this.tagData.suffix.trim()}`;
  }

  get prerelease() {
    return /([0-9.]{5}(-[\w.0-9]+)?)/i.test(this.version);
  }

  get build() {
    return /([0-9.]{5}(\+[\w.0-9]+)?)/i.test(this.version);
  }

  async getMessage(): Promise<string> {
    if (this.message) {
      return this.message;
    }

    const { owner, repo } = this.repoData;

    try {
      const tags = await this.getTags();

      if (!tags || tags.length === 0) {
        return `Version ${this.version}`;
      }

      const base = tags.shift()?.name;
      if (!base) {
        throw new Error("Base could not be obtained");
      }
      const basehead = `${base}...${headBranch()}`;
      const changelog = await this.github.rest.repos.compareCommitsWithBasehead({ owner, repo, basehead });
      const tpl = (core.getInput('commit_message_template', { required: false }) || '').trim();

      return changelog.data.commits
        .map(
          (commit, i) => {
            if (tpl.length > 0) {
              return tpl
                .replace(/\{\{\s?(number)\s?\}\}/gi, (i + 1).toString())
                .replace(/\{\{\s?(message)\s?\}\}/gi, commit.commit.message)
                .replace(/\{\{\s?(author)\s?\}\}/gi, commit.author ? (commit.author.login ?? '') : '')
                .replace(/\{\{\s?(sha)\s?\}\}/gi, commit.sha)
                .trim() + '\n';
            } else {
              return `${i === 0 ? '\n' : ''}${i + 1}) ${commit.commit.message}${commit.author?.login
                ? ` (${commit.author.login})`
                : ''
                }\n(SHA: ${commit.sha})\n`;
            }
          })
        .join('\n');
    } catch (e) {
      core.warning('Failed to generate changelog from commits: ' + (e as { message: string }).message + EOL);
      return `Version ${this.version}`;
    }
  }

  async getTags() {
    if (this.tags) {
      return this.tags.data;
    }

    const { owner, repo } = this.repoData;

    this.tags = await this.github.rest.repos.listTags({ owner, repo, per_page: 100 });

    return this.tags.data;
  }

  async exists() {
    if (this.doesExist !== null) {
      return this.doesExist;
    }
    const currentTag = this.name;
    const tags = await this.getTags();

    for (const tag of tags) {
      if (tag.name === currentTag) {
        this.doesExist = true;
        return true;
      }
    }

    this.doesExist = false;
    return false;
  }

  async push() {
    const tagexists = await this.exists();

    if (!tagexists) {
      const { owner, repo } = this.repoData;
      const sha: string = githubSha();
      // Create tag
      const newTag = await this.github.rest.git.createTag({
        owner,
        repo,
        tag: this.name,
        message: await this.getMessage(),
        object: sha,
        type: 'commit'
      });

      this.sha = newTag.data.sha;
      core.warning(`Created new tag: ${newTag.data.tag}`);

      // Create reference
      let newReference;

      try {
        newReference = await this.github.rest.git.createRef({
          owner,
          repo,
          ref: `refs/tags/${newTag.data.tag}`,
          sha: newTag.data.sha
        });
      } catch (e) {
        core.warning(JSON.stringify({
          owner,
          repo,
          ref: `refs/tags/${newTag.data.tag}`,
          sha: newTag.data.sha
        }));

        throw e;
      }

      this.uri = newReference.data.url;
      this.ref = newReference.data.ref;

      core.warning(`Reference ${newReference.data.ref} available at ${newReference.data.url}` + EOL);
    } else {
      core.warning('Cannot push tag (it already exists).');
    }
  }

  get values() {
    const values = {
      name: this.name,
      sha: this.sha,
      uri: this.uri,
      message: this.message,
      ref: this.ref
    };
    return values
  }
}


