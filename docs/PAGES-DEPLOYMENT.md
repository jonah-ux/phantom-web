# GitHub Pages deployment

The Pages workflow is intentionally small and provider-independent. It uses the same locked Node/npm build as CI, sets `VITE_BASE_PATH=/phantom-web/`, validates that the generated HTML points at `/phantom-web/assets/`, uploads `dist/` as the Pages artifact, and deploys through the `github-pages` environment.

## Local proof

From a clean checkout:

```sh
npm ci
VITE_BASE_PATH=/phantom-web/ npm run build
npm run check:pages
```

`check:pages` refuses a build that contains root-relative `/assets/` references because those work at a domain root but fail at the repository subpath.

## Public proof

After the workflow completes, check both surfaces:

```sh
gh run list --repo jonah-ux/phantom-web --workflow pages.yml --limit 3
curl -fsS https://jonah-ux.github.io/phantom-web/ | head
```

The workflow run proves that GitHub accepted and deployed the artifact. The URL readback proves that the public Pages site serves it. A passing build or a merged workflow alone does not establish public adoption.
