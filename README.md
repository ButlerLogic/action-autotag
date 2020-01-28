# Multipublish

This action will scan a code base and publish any public JavaScript modules it detects. Modules are detected by the presence of a `package.json`. Private packages will not be published and `.npmrc` files will be respected if they exist within the module's root directory.

It was primarily designed for workflows which require variations of a module to be published under different names. For example, a Node version and a brower version of the same library.

This action serves as the last step of a multi-phase deployment process:

1. [Build & Test](https://github.com/author/template-cross-runtime) for multiple runtimes.
1. [Autotag](https://github.com/marketplace/actions/autotagger) new versions by updating `package.json`.
1. Publish multiple modules (i.e., this action).

## Usage

The following is an example `.github/main.workflow` that will execute when a `release` occurs.

```yaml
name: My Workflow

on:
  release:
    types:
    - published
    # - created

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@master
    - uses: author/action-multipublish@stable
      with:
        REGISTRY_TOKEN: "${{ secrets.REGISTRY_TOKEN }}" # Typically an npm token
```

To make this work, the workflow must have the checkout action _before_ the multipublish action.

This **order** is important!

```yaml
- uses: actions/checkout@master
- uses: butlerlogic/action-autotag@1.0.0
```

> If the repository is not checked out first, the autotagger cannot find the package.json file.

## Configuration

The `REGISTRY_TOKEN` must be passed in. Without this, it may not be possible to publish. If you are publishing to a registry which does not require authentication, please consider a more secure alternative.

```yaml
- uses: author/action-multipublish@1.0.0
  with:
    REGISTRY_TOKEN: "${{ secrets.REGISTRY_TOKEN }}"
```

The action will automatically extract the token at runtime. **DO NOT MANUALLY ENTER YOUR TOKEN.** If you put the actual token in your workflow file, you'll make it accessible (in plaintext) to anyone who ever views the repository (it will be in your git history).

### Optional Configurations

There are several options to customize how the tag is created.

1. `scan`

    The scan attribute tells the multipublish to "look for modules in these directories". By default, multipublish will look in the project root. Multiple directories can be supplied using a standard YAML array (example below).

    A module is detected when a package.json file is recognized. Private packages will not be published.
    
    ```yaml
    - uses: author/action-multipublish@1.0.0
      with:
        scan: ".browser_dist, .node_dist"
        REGISTRY_TOKEN: "${{ secrets.REGISTRY_TOKEN }}"
    ```

1. `version`

    Publishing typically needs to happen in response to a release, which is commonly represented by a git tag (see the [autotagger](https://github.com/marketplace/actions/autotagger)). By specifying a version, 

    ```yaml
    - uses: butlerlogic/action-autotag@1.0.0
      with:
        version: "1.0.1"
        REGISTRY_TOKEN: "${{ secrets.REGISTRY_TOKEN }}"
    ```

## Developer Notes

If you are building an action that runs after this one, be aware this action produces **NO** [outputs](https://help.github.com/en/articles/metadata-syntax-for-github-actions#outputs):

---

## Credits

This action was written and is primarily maintained by [Corey Butler](https://github.com/coreybutler).

# Our Ask...

If you use this or find value in it, please consider contributing in one or more of the following ways:

1. Click the "Sponsor" button at the top of the page.
1. Star it!
1. [Tweet about it!](https://twitter.com/intent/tweet?hashtags=github,actions&original_referer=http%3A%2F%2F127.0.0.1%3A91%2F&text=I%20am%20automating%20my%20workflow%20with%20the%20Multipublisher%20Github%20action!&tw_p=tweetbutton&url=https%3A%2F%2Fgithub.com%2Fauthor%2Faction%2Fmultipublish&via=goldglovecb)
1. Fix an issue.
1. Add a feature (post a proposal in an issue first!).

Copyright &copy; 2020 Author.io, Corey Butler, and Contributors.
