# author/action-publish

This action will scan a code base and publish any public JavaScript modules it detects. It **supports publishing one _or more_ modules**, custom npm registries, and custom `.npmrc` files.

Modules are detected by the presence of a `package.json` file. Private packages will not be published (unless forced) and `.npmrc` files will be respected if they exist within the module's root directory.

This action was designed for workflows which require variations of a module to be published under different names. For example, a Node version and a browser version of the same library.

This action serves as the last step of a multi-phase deployment process:

1. [Build & Test](https://github.com/author/template-cross-runtime) for multiple runtimes.
1. [Autotag](https://github.com/marketplace/actions/autotagger) new versions by updating `package.json`.
1. Publish multiple modules (i.e., this action).

## Usage

### Setup
**First, you'll need an npm security token.**

To get this, [login to your npm account](https://www.npmjs.com/login) and find/create a token:

<img src="https://docs.npmjs.com/assets/images/integrations/tokens-profile.png" height="200px"/>

Additional instructions are available [here](https://docs.npmjs.com/creating-and-viewing-authentication-tokens).

Once you've created your npm token, you'll need to make your Github repo aware of it. To do this, [create an encrypted secret](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets#creating-encrypted-secrets) (called `REGISTRY_TOKEN`).

### Workflow

The following is an example `.github/publish.yml` that will execute when a `release` occurs. There are other ways to run this action too (described later), but best practice is to publish whenever code is released.

```yaml
name: Publish

on:
  release:
    types:
      - published
      # - created

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: author/action-publish@stable
      with:
        # Optionally specify the directories to scan 
        # for modules. If this is not specified, the 
        # root directory is scanned.
        scan: "./dist/browser, ./dist/node"
        # Optionally force publishing as a public 
        # module. We don't recommend setting this,
        # unless you have a very specific use case.
        force: true
      env:
        # Typically an npm token
        REGISTRY_TOKEN: "${{ secrets.NPM_TOKEN }}"

```

To make this work, the workflow must have the checkout action _before_ the publish action.

This **order** is important!

```yaml
- uses: actions/checkout@v2
- uses: author/action-publish@stable
```

> If the repository is not checked out first, the publisher cannot find the `package.json` file(s).

### Optional Configurations (Details)

There are several options to customize how the publisher handles operations.

1. `scan`

    The scan attribute tells the publish action to "look for modules in these directories". If this is not specified, the publish action will scan the project root. Multiple directories can be supplied using a comma-separated **string**. Do not use a YAML array (Github actions does not recognized them).

    This supports glob syntax. Any `node_modules` directories are ignored automatically.

    A module is detected when a `package.json` file is recognized. Private packages will not be published.
    
    ```yaml
    - uses: author/action-publish@stable
      with:
        scan: ".browser_dist, .node_dist"
      env:
        REGISTRY_TOKEN: "${{ secrets.NPM_TOKEN }}"
    ```

1. `ignore`

    The ignore attribute tells the publish action to skip any modules matching the ignored patterns.

    ```yaml
    - uses: author/action-publish@stable
      with:
        scan: "./"
        ignore: "**/build, **/test"
      env:
        REGISTRY_TOKEN: "${{ secrets.NPM_TOKEN }}"
    ```

1. `force`

    It's somewhat possible to force publishing, even if the `private: true` attribute is specified in a `package.json` file. Whether this option will be respected or not is dependent on the registry where the module is being published. Generally, it is not a good idea to use this option. It exists to help with edge cases, such as self-hosted private registries.

    ```yaml
    - uses: author/action-publish@stable
      with:
        force: true
      env:
        REGISTRY_TOKEN: "${{ secrets.NPM_TOKEN }}"
    ```

## Developer Notes

This action is best used as part of a complete deployment process. Consider the following workflow:

```yaml
name: Tag, Release, & Publish

on:
  push:
    branches:
      - master

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # Checkout your updatd source code
    - uses: actions/checkout@v2
    
      # If the version has changed, create a new git tag for it.
    - name: Tag
      id: autotagger
      uses: butlerlogic/action-autotag@stable
      with:
        GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
    
      # The remaining steps all depend on whether or  not
      # a new tag was created. There is no need to release/publish 
      # updates until the code base is in a releaseable state.

      # If the new version/tag is a pre-release (i.e. 1.0.0-beta.1), create
      # an environment variable indicating it is a prerelease.
    - name: Pre-release
      if: steps.autotagger.outputs.tagname != ''
      run: |
        if [[ "${{ steps.autotagger.output.version }}" == *"-"* ]]; then echo "::set-env IS_PRERELEASE=true";else echo "::set-env IS_PRERELEASE=''";fi
    
      # Create a github release
      # This will create a snapshot of the module,
      # available in the "Releases" section on Github.
    - name: Release
      id: create_release
      if: steps.autotagger.outputs.tagname != ''
      uses: actions/create-release@v1.0.0
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        tag_name: ${{ steps.autotagger.outputs.tagname }}
        release_name: ${{ steps.autotagger.outputs.tagname }}
        body: ${{ steps.autotagger.outputs.tagmessage }}
        draft: false
        prerelease: env.IS_PRERELEASE != ''

      # Use this action to publish a single module to npm.
    - name: Publish
      id: publish
      if: steps.autotagger.outputs.tagname != ''
      uses: author/action-publish@stable
      env:
        REGISTRY_TOKEN: "${{ secrets.NPM_TOKEN }}"
```

The configuration above will run whenever new code is merged into the master branch. It will check the code out and use the [butlerlogic/action-autotag](https://github.com/butlerlogic/action-autotag) tag to automatically create a new git tag _if a new version is detected_. If there is no new tag, the action exits gracefully and successfully.

If a new tag exists, the action will create a new Github Release. It is smart enough to determine whether it's a prerelease or not (draft releases are not applicable to this workflow). Once the release/pre-release is created, the code is published to npm.

### Multiple Node Modules

If you're using our [cross-runtime template](https://github.com/author/template-cross-runtime), then you will likely want to publish multiple versions of your module for Node.js and the browser. This requires modified pre-release, release, and publish steps.

#### Releases

We like to archive each module in our releases, making it easier for developers to find prior editions they may need to function in older environents. This can be accomplished by adding a build step _after_ the release step. It may seem counterintuitive to do it after, but you'll need to create a release _before_ uploading artifacts to it.

```yaml
    - name: Build Release Artifacts
        id: build
        run: |
          cd ./build && npm install && cd ../
          npm run build --if-present
          for d in .dist/*/*/ ; do tar -cvzf ${d%%/}-x.x.x.tar.gz ${d%%}*; done;
    
    - name: Upload Release Artifacts
      # This is not one of our actions
      uses: AButler/upload-release-assets@v2.0
      with:
        files: './.dist/**/*.tar.gz'
        repo-token: ${{ secrets.GITHUB_TOKEN }}
```

The last line of the build step above looks for a directory called `.dist`. By default, the cross runtime template generates bundles in:

```sh
.dist
  > node
    - module
    - module
  > browsers
    - module
    - module
```

The `.dist/*/*` finds all of the `module` directories and generates a tarball from them. If you do not care about taking a snapshot of these individual modules for your release, you can remove the last line.

If you do want a snapshot of your modules, none of this is necessary.

#### Publishing Multiple Modules

The final publish step needs to be modified to:

```yaml
    - name: Publish
      id: publish
      if: steps.autotagger.outputs.tagname != ''
      uses: author/action-publish@stable
      with:
        scan: './.dist'
      env:
        REGISTRY_TOKEN: "${{ secrets.NPM_TOKEN }}"
```

The publish action will scan the `.dist` directory (and recursively scan subdirectories) to find all modules and publish them.

---

## Credits

This action was written and is primarily maintained by [Corey Butler](https://github.com/coreybutler).

# Our Ask...

If you use this or find value in it, please consider contributing in one or more of the following ways:

1. Click the "Sponsor" button at the top of the page.
1. Star it!
1. [Tweet about it!](https://twitter.com/intent/tweet?hashtags=github,actions&original_referer=http%3A%2F%2F127.0.0.1%3A91%2F&text=I%20am%20automating%20my%20workflow%20with%20the%20Multipublisher%20Github%20action!&tw_p=tweetbutton&url=https%3A%2F%2Fgithub.com%2Fauthor%2Faction%2Fpublish&via=goldglovecb)
1. Fix an issue.
1. Add a feature (post a proposal in an issue first!).

Copyright &copy; 2020 Author.io, Corey Butler, and Contributors.
