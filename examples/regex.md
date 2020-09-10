# Regex Strategy

The regex strategy uses the pattern identified at `regex_pattern` on the file identified by `root` to determine the version.

**.gorc**
```sh
version: 1.1.0
```

**.github/workflows/example.yml**
```yaml
name: Release New Version

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
        regex_pattern: "/(?:version:)(?:\\s)?(\\d+\\.\\d+\\d+.+)\\n?/"
        root: ./.gorc
        tag_prefix: "v"
        GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
```
