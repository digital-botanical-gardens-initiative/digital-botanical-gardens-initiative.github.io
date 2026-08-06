# DBGI Website — Handoff Instructions

Prepared 2026-08-06 to hand off an in-progress redesign session to a colleague
continuing the work with Codex. Read this whole file before touching anything —
it explains what's done, what's mid-flight and uncommitted, and what's still
blocked on an external PR.

## 1. The two repositories

| Repo | Role | Fork used for this work |
|---|---|---|
| [`digital-botanical-gardens-initiative/digital-botanical-gardens-initiative.github.io`](https://github.com/digital-botanical-gardens-initiative/digital-botanical-gardens-initiative.github.io) | The public Hugo site (this working directory). Deploys to `www.dbgi.org` via GitHub Pages. | [`titodamiani/digital-botanical-gardens-initiative.github.io`](https://github.com/titodamiani/digital-botanical-gardens-initiative.github.io) — this checkout's `origin`. The org repo is `upstream`. |
| [`digital-botanical-gardens-initiative/directus-explorer`](https://github.com/digital-botanical-gardens-initiative/directus-explorer) | Python CLI that queries the DBGI Directus instance for sample/species stats. The site's `prebuild` step shells out to it. Not vendored — either a sibling checkout or a `directus-explorer/` subfolder pointed to by `DIRECTUS_EXPLORER_DIR`. | [`titodamiani/directus-explorer`](https://github.com/titodamiani/directus-explorer) — **note the remotes are named the opposite way round here**: inside `directus-explorer/`, `origin` is the **upstream org repo**, and `titodamiani` is the personal fork. |

Both are plain git checkouts with real commit history — not submodules. The
site repo has `directus-explorer/` in its `.gitignore`, so the local copy at
`directus-explorer/` inside this checkout is invisible to the site repo's own
git status; it's its own independent repo.

## 2. Current state of the site repo (`digital-botanical-gardens-initiative.github.io`)

Branch: `main`, 1 commit ahead of `upstream/main`:

- `9c1a28a` — "Rebuild site to match DBGI Website v4 design handoff" — a large
  visual/structural redesign matching a design handoff prototype
  (`DBGI Website v4.dc.html`, a single-file JS mockup, **not part of this
  repo** — it lived locally at `~/Downloads/DBGI Landing Page Animation/` on
  this machine and is gitignored. If the colleague needs it to keep chasing
  prototype-parity items, get it from whoever supplied the original handoff.)

**The full log of that redesign — every decision, every phase, every
deviation and why — is in [`implementation_plan.md`](implementation_plan.md)
at the repo root (~1000 lines).** Treat it as the primary source of truth for
"why does the code look like this," not this handoff file. Highlights:

- Phases 0–5 (design tokens/nav/footer, Home, Team, News, remaining pages,
  responsive/a11y) are done and verified.
- Phase 6 (Directus-powered per-collector stats) is **plumbing-only, blocked
  on an upstream PR** — see §4 below.
- Two post-verification audit rounds found and fixed prototype/live content
  drift (missing news articles, wrong hero copy, missing garden filter chips,
  a duplicate-listing bug on `/network/`, a missing team page for a garden
  rep). All resolved as of the last plan entry, "Post-audit round 2
  (2026-08-06)."
- A couple of items are explicitly flagged as **open, not guessed at**: a
  "% of species sampled" progress bar the prototype implies but for which no
  real denominator exists anywhere in the data (`data/gardens.yml`,
  `garden_stats.yml`, or the Directus schema) — don't invent one, ask the
  DBGI team for a real field first.

### 2a. Uncommitted local changes — read this before running `git add`

`git status` currently shows a large uncommitted diff (~110 modified files,
several deletions, several new team folders) **on top of** the state
`implementation_plan.md` describes. This is real, intentional in-progress
work from later in the same session, just not yet written up in the plan
file or committed. It falls into a few clear buckets:

1. **Team content-model simplification.** Every `content/team/<slug>/index.md`
   had `bio`, `interests`, `user_groups`, and the `featured: <bool>` line
   removed, and `role` shortened (e.g. `"DBGI Contributor - Plant Metabolome"`
   → `"Plant Metabolome"`). Matching template changes in
   `layouts/team/single.html` (dropped the role/affiliations partial render)
   and `layouts/team/list.html` (added a real surname-based sort — see its
   inline comment — replacing a sort-by-slug that mis-filed the 4 people whose
   slugs are firstname-first: `tito-damiani`, `tomas-pluskal`, `lab-emilie`,
   `jan-smith-eliot`). Two now-unused partials were deleted:
   `layouts/partials/team/affiliations.html` and
   `layouts/partials/team/person-card-compact.html`.
   **`featured:` removal needs a sanity check** — that field drives the
   homepage top-collectors strip logic from Phase 2/decision 6 in the plan;
   confirm `layouts/_partials/home/collectors-strip.html` still renders the
   right 6 people before treating this as done (it currently reads from
   `data/collector_name_map.yml` + `hugo.Data`, not the front-matter flag
   directly, per "Post-audit round 2," so it's likely fine, but verify).
2. **Team roster additions/removals.** Added: `bortl-ludvik`,
   `malcolm-patricia`, `maliukova-anna`, `pickering-tom` (no avatar —
   check whether one should exist before this ships), `ribera-tort-arnau`,
   `rihova-gabriela`, `rutz-adriano`. Removed: `alvarez-nadir`,
   `barillari-caterina`, `cudre-mauroux-philippe`, `dessimoz-christophe`,
   `galgonek-jakub`, `rinn-bernd`, `wang-ming`, `willighagen-egon`. No
   dangling references to the removed slugs remain in `data/` or `content/`
   (checked). `data/collector_name_map.yml` was updated to match (e.g. "Anna
   Maliukova" moved from `unmatched_directus_names` to a real `team_slug`
   entry now that her page exists).
3. **`data/labs.yml` restructure**: focus-area tag lists reworded per lab, lab
   membership lists updated to match the roster changes above, "Laboratory of
   Functional Ecology" (Rasmann) removed as its own lab entry.
4. **News year-filter**: new `static/js/news-filter.js` + presumably matching
   markup in `layouts/news/list.html` (check the diff) — a from/to year
   dropdown filter over the news list, following the same
   self-contained-IIFE pattern as the repo's other small JS files
   (`coverage-bars.js`, `garden-filter.js`).
5. **i18n override**: new `i18n/en.yaml` overriding one Hinode module string
   (`ui_search`: "Search this site" → "Search") to match the design handoff.
6. **Map cleanup**: `layouts/_partials/utilities/garden-map.html`,
   `layouts/shortcodes/garden-map.html`, `layouts/shortcodes/lab-map.html`,
   `static/js/garden-map.js`, `static/js/lab-map.js` deleted; `network-map.js`
   and `network-map.html` modified instead — looks like a consolidation onto
   a single network map component. Confirm nothing still references the
   deleted shortcodes before committing (a quick
   `grep -rn "garden-map\|lab-map" content/` is worth running).
7. Misc: `layouts/partials/funding/cards.html` deleted (funding page/nav entry
   was already removed per plan decision 10 — this looks like a leftover
   partial finally getting cleaned up), `static/img/funders/gacr.svg` deleted
   in favor of a new untracked `static/img/funders/gacr.jpg`, plus normal
   `static/css/dbgi.css` diff churn (compiled output following the SCSS
   changes) and `hugo_stats.json` diff (Hugo's own generated CSS-class
   inventory — regenerates itself, not meaningful to review).

**None of this is committed.** Before Codex does anything else, it should:

- Run `npm run build` (see the dev-server caveat in §5) and `npm run lint` to
  confirm this in-progress state is actually clean.
- Spot-check bucket 4 (news filter) and bucket 6 (map cleanup) with a `git
  diff` read-through — those are the two buckets where I haven't described
  the exact diff content above, just what the new/deleted files imply.
- Decide commit granularity (the implementation_plan.md phases were shipped
  as "small phased commits" per decision 2 — keep that convention: split this
  into a few logical commits rather than one giant one, e.g. team
  simplification, roster sync, news filter, map consolidation).
- Add a new entry to `implementation_plan.md` documenting this pass (what,
  why, verification) — the file's own convention is to never silently leave
  work undocumented, and every phase so far has a "Status: ... verified"
  writeup. Whoever picks this up should ask the person who did this work
  (or infer from Directus / the design prototype) *why* the team bios were
  stripped and the roster changed, since that motivation isn't recorded
  anywhere in the file tree itself.

## 3. Verification protocol (from `implementation_plan.md`, apply to any new change)

- **Stop the `npm run start` dev server before running `npm run build`**, then
  restart it after. Concurrent dev-server + build races on `_vendor/` and
  `resources/_gen/` and produces spurious errors — this bit the original
  session more than once.
- `npm run build` should succeed with only pre-existing deprecation warnings
  (`.Site.Data`/`.Site.Languages`/`.Site.AllPages`) and expected "No content"
  warnings for the ~6 pages whose copy is hardcoded in Go templates (About,
  Work, Open Science, Publications, Network, Contact).
- `npm run lint` (scripts/styles/markdown) — markdownlint has ~27 pre-existing
  errors unrelated to this work (news-article formatting nits,
  `implementation_plan.md` itself, `LICENSE.md`); don't let new work add to
  that count, but don't chase the pre-existing ones either.
- Manual QA: the original session used ad hoc Playwright scripts (breakpoint
  matrix across all routes at 1440px/375px, click-through tests for the
  gardens filter chips) that were **not saved into the repo** — they lived in
  the Claude Code session's scratch space. Codex will need to write its own
  quick check scripts or do this by hand; there's no committed test suite for
  this beyond `npm run lint`.

## 4. Blocking dependency: `directus-explorer` PR

Local checkout: `directus-explorer/` (gitignored inside this repo, its own
independent git history). Current branch `add-collector-sample-summary`, 1
commit ahead of `origin/main` (the upstream org repo, confusingly named
`origin` in this particular checkout — see the table in §1):

```
b22c146 feat: add collector grouping to samples summary
```

Adds `--group-by collector` to `directus-explorer`'s `samples summary` CLI
command (collected-sample counts per collector via
`Field_Data.collector_fullname`; profiled/positive/negative counts are always
zero for this grouping since collector identity doesn't survive the sample →
extraction → MS-injection container chain). Verified against production
Directus data. Pushed to the fork
(`titodamiani/directus-explorer@add-collector-sample-summary`) but **no PR
has been opened against the upstream org repo yet.**

**Next step**: open a PR from `titodamiani/directus-explorer:
add-collector-sample-summary` into
`digital-botanical-gardens-initiative/directus-explorer:main`, get it
reviewed and merged.

**Only after that merge lands**, on the site repo side:

1. Uncomment/enable the real aggregation call in
   `scripts/update-collector-stats.mjs` (currently gated behind a marker
   since calling it before the upstream mode exists would just error — see
   the script and the Phase 6 section of `implementation_plan.md`).
2. Add `"data:collectors": "node scripts/update-collector-stats.mjs"` into
   the `prebuild` npm script (next to `data:gardens`), in `package.json`.
3. No new CI secrets needed — `.github/workflows/build-and-deploy.yml`'s
   `Build` step already has `DIRECTUS_INSTANCE`/`DIRECTUS_USERNAME`/
   `DIRECTUS_PASSWORD`/`DIRECTUS_EXPLORER_TOKEN`.
4. Update `README.md`'s "Directus-powered collector stats" section to drop
   the "not wired into prebuild yet" caveat.
5. Optionally extend `layouts/_partials/home/collectors-strip.html` and/or a
   fuller attribution view once real per-collector numbers exist beyond the
   top-6 the current `data/collector_name_map.yml` already covers — extending
   that map to every collector is explicitly flagged as optional future work
   in the plan.

**Do not** try to work around this from the site side (e.g. hand-writing
`--group-by collector` output) — the plan is explicit that this is a genuine
upstream dependency, not something to fake.

## 5. Local environment setup

```bash
npm install
npm run start        # http://localhost:1313/
```

Requires Hugo extended (this machine has `v0.152.2+extended+withdeploy`) and
Go (for `hugo mod`) on `PATH` — `npm run prestart`/`prebuild` shell out to
`hugo mod vendor`.

For real Directus-backed stats locally (garden stats always; collector stats
once §4 is unblocked):

```bash
DIRECTUS_EXPLORER_DIR=/path/to/directus-explorer npm run data:gardens
```

`directus-explorer` needs its own `.env` (see `directus-explorer/.env.example`
for the required keys) or the `DIRECTUS_INSTANCE`/`DIRECTUS_USERNAME`/
`DIRECTUS_PASSWORD` env vars set directly. Without Directus reachable, both
`data:gardens` and `data:collectors` warn and keep the last-known-good
`data/*.yml` file (fail-safe `skipOrFail` pattern) — set
`DBGI_REQUIRE_DIRECTUS_STATS=true` to make missing Directus access a hard
error instead (this is what CI's `Build` step does).

## 6. Known open items / non-goals (don't re-litigate these)

- **Hinode theme bug**: plain Markdown root-relative links
  (`[text](/some/route/)`) render with a broken `href` because the vendored
  `assets/link.html` partial strips the leading slash. Workaround in use:
  write internal links in body copy as raw inline `<a href="...">` HTML
  (Goldmark passes raw HTML through). Apply the same workaround to any new
  internal links; don't try to patch the vendored partial (upstream Hinode
  issue, out of scope here).
- **No "% of species sampled" progress bar** on the Gardens list — the
  prototype implies a denominator ("samplable species count") that doesn't
  exist in real data anywhere. Needs a real field from the DBGI/Directus side
  before it can be built; don't estimate or fabricate one.
- **Labs list page intentionally has no filter chips** — the prototype itself
  has chips only on Gardens (by country), asymmetrically; confirmed by
  reading the prototype's own JS. Don't "fix" this to match Gardens.
- **Color mode is light-only by design** (`main.colorMode.enabled = false` in
  `config/_default/params.toml`) — not a bug.
- **Email obfuscation**: `dbgi@protonmail.ch` must never appear as a literal
  string in server-rendered HTML (anti-scraping requirement). Use the
  `{{< email user="…" domain="…" >}}` shortcode / `utilities/obfuscated-mail.html`
  partial for any new place an email address needs to render.
- Netlify config (`netlify.toml`) is legacy/unused. GitHub Pages (the Actions
  workflow) is the authoritative deploy path — don't reintroduce
  Netlify-specific behavior.

## 7. Quick file map

- `implementation_plan.md` — full decision/verification log for the redesign; read before making design/content-model decisions.
- `README.md` — build/serve commands, Directus stats scripts, content section overview.
- `content/team/`, `content/news/`, `content/gardens/`, `content/labs/` — Markdown content with structured front matter.
- `data/*.yml` — structured data (labs, gardens, funding, collector name mapping, Directus-generated stats).
- `layouts/` — Hugo templates; `layouts/_partials/` is site-specific, `layouts/partials/` (no underscore) is legacy Hinode-override style — check which one a page actually uses before editing, some have been consolidated into `_partials` and old duplicates deleted (see §2a bucket 7).
- `scripts/*.mjs` — Directus-stats generator scripts (`update-garden-stats.mjs` is the working reference implementation `update-collector-stats.mjs` mirrors).
- `static/js/` — small vanilla-JS progressive-enhancement scripts (self-contained IIFEs, one concern each: counters, filters, obfuscation, maps).
- `directus-explorer/` — sibling Python repo (gitignored), only needed locally/in CI for live stats.
