# n8n community node: n8n-nodes-narkis

Goal: a verified n8n community node for Narkis, so Narkis gets a listing on n8n.io (integration page + link).
Usage is a bonus; the deliverable is a package that passes n8n verification on the first try.

## What the node does (read-only, public data, no credential)
Narkis has no public customer API, so the node wraps the same public data our ChatGPT plugin uses
(see `/Users/sauel/dev/Narkis/narkis-mcp/` on main: `internal/narkis/client.go` for endpoints,
`internal/locate` for location matching, `internal/policy` for stripping sales text):
- Resource **Photographer** → operation **Get Many by Location**: input country/state/city slugs (or a
  directory path like `us/texas/austin`) → photographers (name, website, specialties, listed price range,
  rating) + city guide URL. Uses `GET https://api.narkis.ai/api/seo/photographers/resolve?niche=headshot-photographers&path=...`.
- Resource **Price** → operation **Get by Location**: listed price stats (median/min/max/avg range, count) for a path.
- Resource **Location** → operation **Get Many**: list covered directory paths (`/slugs?niche=headshot-photographers`),
  optional filter by country/state.
- Resource **Guide** → operations **Get Many** (published blog posts, paginated `/api/blog/posts?page=&limit=`)
  and **Get** (by slug, `/api/blog/posts/{slug}`) returning title, summary, URL, text.
Keep it simple: exact slugs/paths as inputs (use n8n `loadOptions`/resource locator for country → state → city
if clean; otherwise plain strings with good descriptions). No fuzzy matching needed.

## Hard requirements (n8n verification guidelines)
- Scaffold with the official `n8n-node` CLI (`npm create @n8n/node` / `npx n8n-node new`); TypeScript;
  declarative style preferred.
- Package name `n8n-nodes-narkis`; keyword `n8n-community-node-package`; MIT license; `n8n` attribute in
  package.json with nodes (credentials: none unless the linter demands one); `author.email` = support@narkis.ai,
  author name "Narkis.ai"; repository `https://github.com/SignedAdam/n8n-nodes-narkis`.
- **Zero runtime dependencies**; only n8n request helpers; no fs/process.env/eval/setTimeout.
- SVG icon (Narkis logo; source `narkis-app/public/` in the Narkis repo — make a clean square SVG), codex file,
  `usableAsTool: true`, inputs/outputs `NodeConnectionTypes.Main`.
- README (English): what it does, operations, example workflow JSON, "no credentials needed", compatibility.
- `npm run lint` passes; `npx @n8n/scan-community-package` can't run before publish, but run every local
  check the CLI offers.
- `.github/workflows/publish.yml` that publishes to npm with provenance on tag push (`npm publish --provenance
  --access public`, `id-token: write`), supporting npm Trusted Publishing (OIDC) with an `NPM_TOKEN` fallback comment.
- Do NOT include sales copy, prices of Narkis packages, or signup links in node descriptions/outputs (reuse the
  policy idea: strip "AI headshots from $NN" style sentences from passed-through text).

## Verify end to end
- Run n8n locally in Docker (`docker run --rm -p 5678:5678 -v <pkg-dist>:/home/node/.n8n/custom ...` or
  `npm run dev` from the CLI) with the node loaded; execute every operation against the live API via the n8n
  REST/CLI (e.g. import a workflow JSON and `n8n execute --file`), save real outputs to `VERIFY.md`.
- Also verify the node works as an AI Agent tool if practical.

## Location / rules
- Work in `/Users/sauel/dev/n8n-nodes-narkis` (new standalone git repo, branch `main`). Commit there.
  Do NOT create the GitHub repo, do NOT push, do NOT publish to npm. Report what's ready.
- Final report: files, lint/test results, sample outputs, anything the human must do (npm account, trusted
  publisher, creator portal).
