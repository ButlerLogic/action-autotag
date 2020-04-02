# Autotag

This action will auto-generate a Github tag whenever a new version is detected. The following "detection strategies" are available:

1. **package**: Monitor a `package.json` for new versions.
1. **docker**: Monitor a `Dockerfile` for a `LABEL version=x.x.x` value.
1. **regex**: Use a JavaScript [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) with any file for your own custom extraction.

When a version is detected, it is compared to the current list of tags in the Github repository. If a tag does not exist, it will be created.

This action works well in combination with:

- [actions/create-release](https://github.com/actions/create-release) (Auto-release)
- [author/action-publish](https://github.com/author/action-publish) (Auto-publish JavaScript/Node modules)
- [author/action-rollback](https://github.com/author/action-rollback) (Auto-rollback releases on failures)
- [author/template-cross-runtime](https://github.com/author/template-cross-runtime) (a cross-runtime JavaScript repo template)

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
    - uses: actions/checkout@v2
    - uses: butlerlogic/action-autotag@stable
      with:
        GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
```

To make this work, the workflow must have the checkout action _before_ the autotag action.

This **order** is important!

```yaml
- uses: actions/checkout@v2
- uses: butlerlogic/action-autotag@stable
```

> If the repository is not checked out first, the autotagger cannot find the package.json file.

## Configuration

The `GITHUB_TOKEN` **must** be provided. Without this, it is not possible to create a new tag. Make sure the autotag action looks like the following example:

```yaml
- uses: butlerlogic/action-autotag@stable
  with:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
```

The action will automatically extract the token at runtime. **DO NOT MANUALLY ENTER YOUR TOKEN.** If you put the actual token in your workflow file, you'll make it accessible (in plaintext) to anyone who ever views the repository (it will be in your git history).

### Optional Configurations

There are several options to customize how the tag is created.

#### strategy

This is the strategy used to identify the version number/tag from within the code base.

1. _package_: Monitor a `package.json` for new versions. Use this for JavaScript projects based on Node modules (npm, yarn, etc).
1. _docker_: Monitor a `Dockerfile` for a `LABEL version=x.x.x` value. USe this for container projects.
1. _regex*_: Use a JavaScript [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) with any file for your own custom extraction.

*An example "

#### root `(required)`
_Formerly `package_root`_

By default, autotag will look for the `package.json` file in the project root. If the file is located in a subdirectory, this option can be used to point to the correct file.

```yaml
- uses: butlerlogic/action-autotag@1.0.0
  with:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
    root: "/path/to/subdirectory"
```

> **EXCEPTION**: This property is not required if the regex_pattern property is defined. In that case, this property is assumed to be "regex".

#### tag_prefix

By default, [semantic versioning](https://semver.org/) is used, such as `1.0.0`. A prefix can be used to add text before the tag name. For example, if `tag_prefix` is set to `v`, then the tag would be labeled as `v1.0.0`.

```yaml
- uses: butlerlogic/action-autotag@1.0.0
  with:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
    tag_prefix: "v"
```

#### tag_suffix

Text can be applied to the end of the tag by setting `tag_suffix`. For example, if `tag_suffix` is ` (beta)`, the tag would be `1.0.0 (beta)`. Please note this example violates semantic versioning and is merely here to illustrate how to add text to the end of a tag name if you _really_ want to.

```yaml
- uses: butlerlogic/action-autotag@1.0.0
  with:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
    tag_suffix: " (beta)"
```

#### tag_message

This is the annotated commit message associated with the tag. By default, a changelog will be generated from the commits between the latest tag and the current reference (HEAD). Setting this option will override the message.

```yaml
- uses: butlerlogic/action-autotag@1.0.0
  with:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
    tag_message: "Custom message goes here."
```

#### version

Explicitly set the version instead of using automatic detection.

Useful for projects where the version number may be output by a previous action.

```yaml
- uses: butlerlogic/action-autotag@1.0.0
  with:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
    version: "${{ steps.previous_step.outputs.version }}"
```

#### regex_pattern

An optional attribute containing the regular expression used to extract the version number.

```yaml
- uses: butlerlogic/action-autotag@1.0.0
  with:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
    regex_pattern: "version=([0-9\.]+)"
```

This attribute is used as the first argument of a [RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/RegExp) object. The first "group" (i.e. what's in parenthesis) will be used as the version number. For an example, see this [working example](regexr.com/51i6n).

## Developer Notes

If you are building an action that runs after this one, be aware this action produces several [outputs](https://help.github.com/en/articles/metadata-syntax-for-github-actions#outputs):

1. `tagname` will be empty if no tag was created, or it will be the value of the new tag.
1. `tagsha`: The SHA of the new tag.
1. `taguri`: The URI/URL of the new tag reference.
1. `tagmessage`: The messge applied to the tag reference (this is what shows up on the tag screen on Github).
1. `tagcreated`: `yes` or `no`.
1. `tagrequested`: The name of the requested tag. This will be populated even if the tag is not created. This will usually be the same as `tagname` and/or `version` for successful executions.
1. `version` will be the version attribute found in the `package.json` file.

---

## Credits

This action was written and is primarily maintained by [Corey Butler](https://github.com/coreybutler).

# Our Ask...

If you use this or find value in it, please consider contributing in one or more of the following ways:

1. Click the "Sponsor" button at the top of the page and make a contribution.
1. Star it!
1. [Tweet about it!](https://twitter.com/intent/tweet?hashtags=github,actions&original_referer=http%3A%2F%2F127.0.0.1%3A91%2F&text=I%20am%20automating%20my%20workflow%20with%20the%20Autotagger%20Github%20action!&tw_p=tweetbutton&url=https%3A%2F%2Fgithub.com%2Fmarketplace%2Factions%2Fautotagger&via=goldglovecb)
1. Fix an issue.
1. Add a feature (post a proposal in an issue first!).

Copyright &copy; 2020 Butler Logic, Corey Butler, and Contributors.
