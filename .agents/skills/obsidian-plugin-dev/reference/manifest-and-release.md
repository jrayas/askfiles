# Manifest and release (verified 2026-10-15)

## manifest.json
```json
{
  "id": "word-counter",
  "name": "Word counter",
  "version": "1.0.0",
  "minAppVersion": "1.13.4",
  "description": "Count words and characters in the active note.",
  "author": "Your Name",
  "authorUrl": "https://example.com",
  "isDesktopOnly": false
}
```

| Field | Required | Rules |
|---|---|---|
| `id` | yes | lowercase letters and hyphens; must not end with `plugin`; must not contain `obsidian`; unique; **never change** after release; equals the plugin folder name during development (else `onExternalSettingsChange` is not called) |
| `name` | yes | short; Basic Latin only; no punctuation except `-`, `+`, `()`; no emoji; no "Obsidian" (or "Obsi-", "-sidian"); no "Plugin"; not a core feature name on its own ("Graph view", "Bases", "Live Preview"); unique. Renaming via manifest is allowed; invalid names get delisted |
| `version` | yes | `x.y.z` only |
| `minAppVersion` | yes | real minimum; if unsure, latest stable |
| `description` | yes | ≤250 characters; starts with an action ("Translate…", "Import…"); not "This is a plugin…"; ends with "."; no emoji; correct capitalisation (Obsidian, Markdown, PDF) |
| `author` | yes | |
| `isDesktopOnly` | yes | `true` if any Node.js/Electron API is used (`fs`, `crypto`, `os`, `electron`…) |
| `authorUrl` | no | |
| `fundingUrl` | no | only for donation services; string or `{ "Label": "url" }`; remove it if you take no donations |

## versions.json
Maps each plugin version to its minAppVersion, e.g. `{ "1.0.0": "1.13.4" }`. Obsidian uses it to offer older apps the newest compatible release. The sample's `npm version` script (`version-bump.mjs`) updates it.

## Repository
- Root: `README.md` (purpose, usage; disclose network use, accounts, payments, files outside the vault), `LICENSE` (GitHub must recognise it, else a warning), `manifest.json`.
- The directory reads `manifest.json` at HEAD of the default branch.
- Do not commit `main.js` or `node_modules`.
- Private source is allowed: public repo with release assets + private source repo connected through the "Obsidian Community directory" GitHub App; the build output is still verified against the source.

## Release & GitHub Artifact Attestations
1. **Never upload release assets from your local machine** (`gh release create` with local files or manual browser upload). The community directory's review bot checks cryptographic build provenance and will flag:
   `Recommendation: Missing GitHub artifact attestations for release assets (main.js, styles.css)`
2. Commit `.github/workflows/release.yml` with `id-token: write` and `attestations: write` permissions so GitHub Actions builds and attests `main.js`, `manifest.json`, and `styles.css` via `actions/attest-build-provenance@v2`:

```yaml
name: Release Obsidian Plugin

on:
  push:
    tags:
      - "*"
  workflow_dispatch:
    inputs:
      tag:
        description: "Release tag (e.g. 0.1.0)"
        required: true
        default: "0.1.0"

permissions:
  contents: write
  id-token: write
  attestations: write

jobs:
  build-and-release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Install dependencies
        run: npm install

      - name: Lint and build plugin
        run: |
          npm run lint
          npm run build

      - name: Attest build provenance for release assets
        uses: actions/attest-build-provenance@v2
        with:
          subject-path: |
            main.js
            manifest.json
            styles.css

      - name: Create or update GitHub Release
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAG_NAME: ${{ github.ref_name }}
        run: |
          if gh release view "$TAG_NAME" >/dev/null 2>&1; then
            gh release upload "$TAG_NAME" main.js manifest.json styles.css --clobber
          else
            gh release create "$TAG_NAME" main.js manifest.json styles.css \
              --title "$TAG_NAME" \
              --generate-notes
          fi
```

3. Bump `version` in `manifest.json`, `package.json`, and `versions.json`, commit, and push a tag equal to the version (`git tag -a 0.1.0 -m "Release 0.1.0" && git push origin 0.1.0`, no `v` prefix). Wait for the GitHub Actions workflow to finish (`gh run watch`) before submitting or requesting a review.

## Submit (first release only)
1. Sign in at https://community.obsidian.md with an Obsidian account; link GitHub.
2. Add the plugin (Set up and claim → Add a plugin).
3. Automated review runs: sections **Manifest, Releases, Source code, Build verification**; results Error / Warning / Recommendation / Pass. Errors block installation; warnings do not.
4. Fix and publish a new release; use **Request review** to recheck, or **Review branch** to preview a scan without releasing.
5. Later updates need only a new GitHub release.

## Scanner facts
- Build command: first of `build`, `build:plugin`, `compile` in package.json — make it your production build.
- Ignored paths: `node_modules, dist, build, pkg, test-vault, .pnpm-store, .obsidian, esbuild.config.mjs, version-bump.mjs, automation, *.test.*, *.tests.*, *.spec.*, *.specs.*, test, tests, __tests__, testUtils, e2e-tests, mocks, __mocks__, *.cjs, *.mjs, *.cts, *.mts, vite, scripts, docs, i18n, i18next, locale, locales, translations, l10n`.
- Run the checks locally with eslint-plugin-obsidianmd.
