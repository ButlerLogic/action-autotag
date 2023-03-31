# Autotag

This action will generate a Github tag when a new version is detected.

```mermaid
graph LR
  e[Detect/Extract<br/>Semantic Version]
  e-->c[Compare<br/>to Existing Tags]
  c-->d{Newer?}
  d.->|No|Done
  d.->|Yes|p[Create Tag]
```

There are several "detection strategies" to choose from:

1. **package**: Extract from `package.json`.
1. **composer**: Extract from `composer.json`.
1. **docker**: Extract from `Dockerfile`, in search of a `LABEL version=x.x.x` value.
1. **regex**: Use a JavaScript [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) with any file for your own custom extraction.
1. _**manual**_: Manually supply the version number (no need to specify this strategy, just specify the version).

When a new version is detected, it is compared to the current tags in the Github repository. If the version is newer than other tags (or if no tags exist yet), the version will be used to create a new tag.

### Tagging: Part of a Complete Deployment Solution
This action works well in combination with:

- [actions/create-release](https://github.com/actions/create-release) (Auto-release)
- [author/action-publish](https://github.com/author/action-publish) (Auto-publish JavaScript/Node modules)
- [author/action-rollback](https://github.com/author/action-rollback) (Auto-rollback releases on failures)

## Usage

The following is an example `.github/workflows/main.yml` that will execute when a `push` to the `master` branch occurs.

```yaml
name: Create Tag

on:
  push:
    branches:
      - master

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: butlerlogic/action-autotag@stable
      env:
        GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
```

To make this work, the workflow must have the checkout action _before_ the autotag action.

This **order** is important!

```yaml
- uses: actions/checkout@v2
- uses: butlerlogic/action-autotag@stable
```

**If the repository is not checked out first, the autotagger cannot find the source files.**

## Configuration

The `GITHUB_TOKEN` **must** be provided. Without this, it is not possible to create a new tag. Make sure the autotag action looks like the following example:

```yaml
- uses: butlerlogic/action-autotag@stable
  env:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
```

The action will automatically extract the token at runtime. **DO NOT MANUALLY ENTER YOUR TOKEN.** If you put the actual token in your workflow file, you'll make it accessible (in plaintext) to anyone who ever views the repository (it will be in your git history).

## Optional Configuration Options

There are several options to customize how the tag is created.

### strategy (required)

This is the strategy used to identify the version number/tag from within the code base.

```yaml
- uses: butlerlogic/action-autotag@1.0.0
  env:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
  with:
    strategy: <your_choice>
```

1. _package_: Search `package.json` for new versions. Use this for JavaScript projects based on Node/Deno/Bun modules (npm, yarn, etc).
1. _composer_: Same as package, but uses `composer.json` instead of package.json.
1. _docker_: Search a `Dockerfile` for a `LABEL version=x.x.x` value. Use this for container projects.
1. _regex*_: Use a JavaScript [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) with any file for your own custom extraction.

> **EXCEPTION**: This property is _not_ required if the `regex_pattern` property (below) is defined, because it is assumed to be "regex".

### root

Depending on the selected strategy, autotagger will look for the confgured identify file (i.e. `package.json`, `composer.json`, `Dockerfile`, etc) in the project root. If the file is located in a subdirectory, this option can be used to point to the correct file.

_Using the **package** (or composer) strategy:_

```yaml
- uses: butlerlogic/action-autotag@1.0.0
  env:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
  with:
    strategy: package # Optional, since "package" is the default strategy
    root: "/path/to/subdirectory"
```

The version number would be extracted from `/path/to/subdirectory/package.json`.

_Using the **docker** strategy:_

```yaml
- uses: butlerlogic/action-autotag@1.0.0
  env:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
  with:
    strategy: docker
    root: "/path/to/subdirectory"
```

The version number would be extracted from `/path/to/subdirectory/Dockerfile`, specifically looking for the `LABEL version=x.x.x` line within the file.

_Using the **regex** strategy:_

```yaml
- uses: butlerlogic/action-autotag@1.0.0
  env:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
  with:
    strategy: regex # Optional since regex_pattern is defined
    root: "/path/to/subdirectory/my.file"
    regex_pattern: "version=([0-9\.])"
```

The version will be extracted by scanning the content of `/path/to/subdirectory/my.file` for a string like `version=1.0.0`. See the `regex_pattern` option for more details.

### regex_pattern

An optional attribute containing the regular expression used to extract the version number.

```yaml
- uses: butlerlogic/action-autotag@1.0.0
  env:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
  with:
    regex_pattern: "version=([0-9\.]{5}([-\+][\w\.0-9]+)?)"
```

This attribute is used as the first argument of a [RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/RegExp) object. The first "group" (i.e. what's in the main set of parenthesis/the whole version number) will be used as the version number. For an example, see this [working example](https://regexr.com/51r8j).

The pattern described in this example is a simplistic one. If you need a more explicit one the [complete semver pattern](https://regex101.com/r/vkijKf/1/) is:

```
^((0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)$
```

As of `1.1.2`, JavaScript named patterns are supported, where the group named `version` will be used to populate the tag. For example:

```yaml
- uses: butlerlogic/action-autotag@1.0.0
  env:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
  with:
    regex_pattern: "(version=)(?<version>[\d+\.]{3}([-\+][\w\.0-9]+)?)"
```

### tag_prefix

By default, [semantic versioning](https://semver.org/) is used, such as `1.0.0`. A prefix can be used to add text before the tag name. For example, if `tag_prefix` is set to `v`, then the tag would be labeled as `v1.0.0`.

```yaml
- uses: butlerlogic/action-autotag@1.0.0
  env:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
  with:
    tag_prefix: "v"
```

### tag_suffix

Text can be applied to the end of the tag by setting `tag_suffix`. For example, if `tag_suffix` is ` (beta)`, the tag would be `1.0.0 (beta)`. Please note this example violates semantic versioning and is merely here to illustrate how to add text to the end of a tag name if you _really_ want to.

```yaml
- uses: butlerlogic/action-autotag@1.0.0
  env:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
  with:
    tag_suffix: " (beta)"
```

### tag_message

This is the annotated commit message associated with the tag. By default, a changelog will be generated from the commits between the latest tag and the current reference (HEAD). Setting this option will override the message.

```yaml
- uses: butlerlogic/action-autotag@1.0.0
  env:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
  with:
    tag_message: "Custom message goes here."
```

### commit_message_template

By default, a changelog is generated, containing the commit messages since the last release. The message is generated by applying a commit message template to each commit's data attributes.

```yaml
- uses: butlerlogic/action-autotag@1.0.0
  env:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
  with:
    commit_message_template: "({{sha}} by {{author}}) {{message}}"
```

Optional data points:

1. `number` The commit number (relevant to the overall list)
1. `message` The commit message.
1. `author` The author of the commit.
1. `sha` The SHA value representing the commit.

The default is `{{number}}) {{message}} ({{author}})\nSHA: {{sha}}\n`.

_Example output:_

```
1) Update README.md (coreybutler)
(SHA: c5e09fc45106a4b27b8f4598fb79811b589a4684)

2) Added metadoc capability to introspect the shell/commands. (coreybutler)
(SHA: b690be366a5636d51b1245a1b39c86102ddb8a81)
```

### version

Explicitly set the version instead of using automatic detection (forces "manual" strategy).

Useful for projects where the version number may be output by a previous action.

```yaml
- uses: butlerlogic/action-autotag@1.0.0
  env:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
  with:
    version: "${{ steps.previous_step.outputs.version }}"
```

### min_version

Set the minimum version which would be used to create a tag.

The default value (`0.0.1`) prevents a `0.0.0` from being created. This can also be used when introducing Autotag to a repository which already has tags.

For example, if the version `0.1.0` is already published, set the `minVersion` to the next patch to prevent a duplicate tag for that version.

```yaml
- uses: butlerlogic/action-autotag@1.0.0
  with:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
    min_version: "0.1.1"
```

### dry_run

If this value is `true`, the tag will not be pushed.
You can check for duplicate versions when creating a pull request.

```yaml
- uses: butlerlogic/action-autotag@1.0.0
  with:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
    dry_run: true
```


## Developer Notes

If you are building an action that runs after this one, be aware this action produces several [outputs](https://help.github.com/en/articles/metadata-syntax-for-github-actions#outputs):

1. `tagname` will be empty if no tag was created, or it will be the value of the new tag.
1. `tagrequested`: The name of the requested tag. This will be populated even if the tag is not created. This will usually be the same as `tagname` and/or `version` for successful executions. This output is typically used for rollbacks/notifications when the creation of a tag fails.
1. `tagsha`: The SHA of the new tag.
1. `taguri`: The URI/URL of the new tag reference.
1. `tagmessage`: The message applied to the tag reference (this is what shows up on the tag screen on Github).
1. `tagcreated`: `yes` or `no`.
1. `version` will be the extracted/provided version.
1. `prerelease`: "yes" or "no", indicating the tag represents a semantic version pre-release.
1. `build`: "yes" or "no", indicating the tag represents a semantic version build.

---

## Credits

This action was written and is primarily maintained by [Corey Butler](https://github.com/coreybutler).

This project has had great contributions from [these wonderful people](https://github.com/ButlerLogic/action-autotag/graphs/contributors). Additional gratitude goes to [Jaliborc](https://github.com/Jaliborc), who came up with the idea and original implementation for a pattern-based tag extraction (the Regex strategy).

**Active Sponsors**

These sponsors are helping make this project possible.

<table cellpadding="10" cellspacing="0" border="0">
  <tr>
    <td><a href="https://metadoc.io"><img src="https://github.com/coreybutler/staticassets/raw/master/sponsors/metadoclogobig.png" width="200px"/></a></td>
    <td><a href="https://butlerlogic.com"><img src="https://github.com/coreybutler/staticassets/raw/master/sponsors/butlerlogic_logo.png" width="200px"/></a></td>
  </tr>
</table>

# Our Ask...

If you use this or find value in it, please consider contributing in one or more of the following ways:

1. Click the "Sponsor" button at the top of the page and make a contribution.
1. Star it!
1. [Tweet about it!](https://twitter.com/intent/tweet?hashtags=github,actions&original_referer=http%3A%2F%2F127.0.0.1%3A91%2F&text=I%20am%20automating%20my%20workflow%20with%20the%20Autotagger%20Github%20action!&tw_p=tweetbutton&url=https%3A%2F%2Fgithub.com%2Fmarketplace%2Factions%2Fautotagger&via=goldglovecb)
1. Fix an issue.
1. Add a feature (post a proposal in an issue first!).

Copyright &copy; 2020-2023 Butler Logic, Corey Butler, and Contributors.
