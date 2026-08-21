# simple-diff-report

Posts a PR delta digest: changed paths, +/- LOC, and top directories. Structure only — no security or quality scanning.

## Usage

```yaml
name: Diff report
on:
  pull_request:

permissions:
  contents: read
  pull-requests: write

jobs:
  simple-diff-report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dmytropaduchak/simple-diff-report@v0.1.1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `github-token` | `${{ github.token }}` | Token to read the PR diff and post sticky comments |
| `top-dirs` | `8` | How many top directories to list by changed LOC |

## Develop

```bash
npm install && npm run build
```
