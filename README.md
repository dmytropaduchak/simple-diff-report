# simple-diff-report

Posts a PR delta digest: changed paths, +/- LOC, and top directories. Structure only — no security or quality scanning.

## Usage

```yaml
- uses: actions/checkout@v4
- uses: dmytropaduchak/simple-diff-report@v0.1.0
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Develop

```bash
npm install && npm run build
```
