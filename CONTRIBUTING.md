# Contributing a plugin

1. Fork this repository and add `plugins/<your-plugin-id>/`:

   ```text
   <plugin-id>/
     manifest.json               plugin info (schemaVersion 5), plus provider services when it is a provider
     assets/                     images; the icons named in manifest.json live here
     apps/<app-id>/              manifest.json + index.html, js, css
     mcp/<server-id>/            manifest.json (id, name, description, plus url for remote or command for local)
                                 + server files, local only; command runs from this folder
     models/manifest.json        provider only: array of every model it offers (id, name, type, ...)
     skills/<skill-id>/          SKILL.md
     scripts/<script-id>/        manifest.json + package.json (build to dist/), a Node script that prints HTML
   ```

   The folder name must equal `id` in `manifest.json`. See `scripts/fixtures/hello-skill/` for a minimal example.
   Kucedr never runs `npm install`, so stdio MCP servers must be bundled: no `node_modules/` and no
   `install`/`preinstall`/`postinstall` scripts.

2. Run `npm ci && node scripts/validate.mjs` locally. The same check runs on your pull request.
3. To test in Kucedr, open Settings → Plugins and drop the folder on the upload tile.
4. For updates, change the files and raise `version`. A pull request that changes a plugin without
   raising its version fails.
5. Open a pull request. Once your plugin is merged, you're added to `CODEOWNERS` for its folder, so
   later changes need your review.

## What gets rejected

- Obfuscated or minified-beyond-reading code that isn't a reproducible bundle
- Network calls the description doesn't mention
- Bundled secrets or API keys
- Copyrighted assets without a license
