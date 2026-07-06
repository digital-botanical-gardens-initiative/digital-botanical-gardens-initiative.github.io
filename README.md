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

Netlify also uses `npm run build`.

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

## Content

Main public sections:

- `content/news/` - DBGI updates
- `content/team/` - people and team profiles
- `content/work/` - current work and open process
- `content/contact/` - contact card page

Old Wowchemy demo content was intentionally removed during the Hinode
migration.
