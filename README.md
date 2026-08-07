# DBGI Website

Website for the Digital Botanical Gardens Initiative:

- https://digital-botanical-gardens-initiative.github.io/
- https://www.dbgi.org/

The site is built with [Hugo](https://gohugo.io/) and the open-source
[Hinode](https://gethinode.com/) theme stack.

## Serve locally

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run start
```

Then open:

```text
http://localhost:1313/
```

## Build

Create a production build:

```bash
npm run build
```

Deployment runs on GitHub Pages via the Actions workflow in `.github/workflows/`.

## Directus-powered garden stats

Garden sample/species stats are generated from Directus via the sibling
[`directus-explorer`](https://github.com/digital-botanical-gardens-initiative/directus-explorer)
project:

```bash
DIRECTUS_EXPLORER_DIR=/Users/pma/git_repos/DBGI/directus-explorer npm run data:gardens
```

The command writes `data/garden_stats.yml`, which Hugo uses on `/gardens/`.
Locally it can use the `.env` file from `directus-explorer`. In CI, configure
these repository secrets:

- `DIRECTUS_INSTANCE`
- `DIRECTUS_USERNAME`
- `DIRECTUS_PASSWORD`
- `DIRECTUS_EXPLORER_TOKEN` if the `directus-explorer` repository is private

The deployment workflow refreshes the stats on pushes, on a daily schedule, and
when triggered by a `repository_dispatch` event of type `directus-updated`.

## Directus-powered collector stats

Per-collector sample counts are generated the same way, via
`scripts/update-collector-stats.mjs`:

```bash
DIRECTUS_EXPLORER_DIR=/path/to/directus-explorer npm run data:collectors
```

The command writes `data/collector_stats.yml` (a `collectors:` map of raw
`collector_fullname` → `collected_samples`), following the same fail-safe
`skipOrFail` contract as `data:gardens`: it warns and exits 0 keeping the
existing file unless `DBGI_REQUIRE_DIRECTUS_STATS=true`.

**This script is not wired into `prebuild`/CI yet, on purpose.** It depends on
a `--group-by collector` mode on `directus-explorer`'s `samples summary`
command that only exists in a local, unmerged change to that repository —
CI checks out `directus-explorer`'s `main` branch fresh on every run, so it
doesn't have this mode. Wire `data:collectors` into `prebuild` (next to
`data:gardens`) only after that change is pushed and merged into
[`digital-botanical-gardens-initiative/directus-explorer`](https://github.com/digital-botanical-gardens-initiative/directus-explorer);
doing so earlier will hard-fail CI, since the `Build` step already sets
`DBGI_REQUIRE_DIRECTUS_STATS: true`.

Two further items are intentionally out of scope for now:

- Per-collector species/profiled counts — collector identity doesn't survive
  the sample → extraction → MS-injection container chain that profiled-sample
  lookups rely on.
- Mapping the free-text `collector_fullname` values to `content/team/<slug>/`
  records — the output keeps raw Directus names; a name→slug mapping file is
  a separate follow-on.

## Content

Main public sections:

- `content/news/` - DBGI updates
- `content/team/` - people and team profiles
- `content/work/` - current work and open process
- `content/contact/` - contact card page

Old Wowchemy demo content was intentionally removed during the Hinode
migration.
