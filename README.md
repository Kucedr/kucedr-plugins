# kucedr-plugins

Plugins for [Kucedr](https://github.com/Kucedr), one folder per plugin in `plugins/`.

- **Catalog:** <https://kucedr.github.io/kucedr-plugins/index.json>. Kucedr reads it to list and install plugins.
- **Packages:** every plugin version is a GitHub Release tagged `<id>-v<version>` with a `.tgz` attached.
- **Contributing:** see [CONTRIBUTING.md](CONTRIBUTING.md).

## How it works

- Pull requests run `node scripts/validate.mjs --base origin/main`, which applies the same checks
  Kucedr runs at install and requires a version bump for changed plugins.
- Merges to `main` release each plugin version that has no release yet, then rebuild `index.json`
  with `scripts/catalog.mjs` and publish it to GitHub Pages. Existing releases are never overwritten.
