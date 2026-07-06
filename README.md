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

## Content

Main public sections:

- `content/news/` - DBGI updates
- `content/team/` - people and team profiles
- `content/work/` - current work and open process
- `content/contact/` - contact card page

Old Wowchemy demo content was intentionally removed during the Hinode
migration.
