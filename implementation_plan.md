# DBGI Website Redesign — Implementation Plan

## Context

The DBGI website (`/Users/tdamiani/Projects/dbgi_website`, Hugo + Hinode v2.8.4) is being
visually and structurally redesigned to match a handoff prototype,
`DBGI Website v4.dc.html` (in `/Users/tdamiani/Downloads/DBGI Landing Page Animation/`,
documented by `IMPLEMENTATION.md`). That file is a single-file JS prototype — a
design/content spec, not code to run. The goal is to rebuild its design, copy, and IA
inside the existing Hugo/Hinode site, preserve real per-item routes for News and Team,
move their content into structured front matter, make the layout genuinely responsive
(not just shrunk), and make the homepage statistics reflect live Directus data with a
safe stale-on-failure fallback — all without swapping frameworks or introducing
unnecessary client-side JS.

Research already completed (full site inventory, full design-file structural extraction,
and file reads of `params.toml`, `menus.en.toml`, `garden_stats.yml`,
`update-garden-stats.mjs`, `netlify.toml`/CSP, the GH Actions workflow, and content
examples) is summarized inline below rather than repeated as a separate step.

**Decisions already made with the user (fixed constraints, not to be revisited):**
1. Directus per-collector stats: build the plumbing only (mirrors `update-garden-stats.mjs`'s
   fail-safe pattern). **Update (2026-08-05):** a local copy of `directus-explorer` was made
   available as a real, writable git clone at `directus-explorer/` inside this repo (gitignored,
   not a submodule). Its `--group-by collector` gap was implemented directly (see Phase 6),
   verified against live production Directus data, and pushed to
   `titodamiani/directus-explorer@add-collector-sample-summary` (a fork branch, PR not yet
   opened/merged upstream). `scripts/update-collector-stats.mjs` exists and has been run for
   real, producing `data/collector_stats.yml`. It is **not** wired into `prebuild`/CI yet,
   since CI checks out the upstream `directus-explorer` repo fresh (no `--group-by collector`
   there until the fork branch is merged) and CI's `Build` step hard-fails on missing stats
   (`DBGI_REQUIRE_DIRECTUS_STATS: true`). "Top collectors" now *does* use live sample counts to
   decide who is featured (see decision 6 below) — the homepage strip itself still shows no
   numbers, per decision 4.
2. Scope: full redesign, delivered as small phased commits (tokens/nav/footer → Home →
   Team → News → remaining pages → responsive/a11y pass → collector-stats plumbing).
3. Deployment: GitHub Pages (existing Actions workflow) is authoritative. `netlify.toml`
   is legacy/unused — no Netlify-specific features. Keep using the existing cron
   (`17 3 * * *`) + `repository_dispatch` mechanism for scheduled refreshes.
4. "Top collectors" homepage strip: curated via a new `featured: true` team front-matter
   field — photo/name/affiliation only, no numbers this pass.
5. Contact page: keep the current static mailto-link-list approach (no JS form). Only
   restyle; do not port the design's JS form. Any new/changed wording needs my
   confirmation before going in, per the "don't alter copy" instruction.
6. **(2026-08-05) Featured team members**: the top 6 people by summed Directus
   `collected_samples` (via `data/collector_stats.yml`), reconciling free-text name variants
   (e.g. "Emilie Lab"/"Émilie Lab"/"Lab Emilie", "Mazzarine laboureau"/"Mazzarine Laboureau")
   through a new `data/collector_name_map.yml`. A tie at rank 2–3 (722 samples each) meant 6
   people naturally, not 5. Current winners: Mazzarine Laboureau (2749), Emilie Lab (830),
   Kateřina Kučerová (722), Emmanuel Defossez (722), Federico Brigante (299), Héloïse Coen
   (225) — `featured: true` already set on these 6 team pages, `featured: false` on the other
   49. Directus collector names with no matching `content/team/` page are listed in
   `collector_name_map.yml`'s `unmatched_directus_names` rather than silently dropped. One
   low-confidence match (`Edouard Brülhart` vs. team page "Edouard Brüelhart") is flagged in
   that file but doesn't affect the top 6. Re-derive this ranking by hand if
   `collector_stats.yml` is regenerated with materially different numbers.
7. **(2026-08-05) Color mode: light-only.** `main.colorMode.enabled = false` in
   `params.toml` — removes the dark/light toggle from the nav entirely and disables Hinode's
   theme-switching JS (`assets/js/critical/color.js` is conditionally compiled out). The site
   now always renders in its default (light) styling.
8. **(2026-08-05) Email anti-scraping.** `dbgi@protonmail.ch` must never appear as a literal
   string in server-rendered HTML. Implemented as a reusable `utilities/obfuscated-mail.html`
   partial + `{{< email user="…" domain="…" >}}` shortcode: renders an `<a>` with
   `data-user`/`data-domain` attributes (no `href`, no visible text) plus a `<noscript>`
   fallback; a small `static/js/obfuscate-email.js` (loaded once, from `footer/footer.html`,
   which renders on every page) reconstructs the real `mailto:` href and visible text on
   `DOMContentLoaded`. Applied to the footer and `content/contact/index.md`; the now-unused
   `[[social]]` "Email" entry was removed from `menus.en.toml` so future code can't
   accidentally reintroduce a plain-text leak by looping over `Site.Menus.social`. (Confirmed
   the site's JSON-LD structured data doesn't leak it either — `sameAs` only pulls from
   `schema.twitter`/`.linkedin`/`.github`.)
9. **(2026-08-05) Final news tag taxonomy**: `Grant`, `Garden sampling`, `Network`,
   `Job Position`, `Milestone` — `Seminar` (mentioned as a possibility during research) is
   dropped. `Job Position` additionally needs a "this position is closed" state (e.g. a
   `position_closed: true` front-matter flag swapping the tag's display/styling), not just a
   plain tag — implement when Phase 3 (News) is reached.
10. **(2026-08-05) Nav must match the handoff prototype exactly — pages, menu items, and
    order.** Superseded Phase 0's original nav-gap resolution (which had folded Team,
    Funding, and Governance into the nav so the pre-existing pages wouldn't 404). Confirmed
    the prototype's actual nav straight from its source (`netMenu` array + About-dropdown
    markup in `DBGI Website v4.dc.html`): Home → **About ▾** (Vision & Goals, Current work,
    Open science, Publications) → **Network ▾** (Overview, Gardens, **Research
    Laboratories** — not "Labs") → News → Contact, in that order (News sits after Network,
    not right after Home). Nothing else. The prototype also has no standalone Governance
    page — Governance is a *section* inside its Network page (already built that way here
    in Phase 4), and no standalone Contributors page — "All contributors" in the prototype
    navigates to the Network page's contributors list, not a separate route. Resolved
    per-page with the user:
    - **Team/Contributors**: unlink from nav, **keep the pages** (`/team/` index + all
      person pages stay on disk — still linked from News author bylines and Garden/Lab
      Head/Contact/Members cards; the homepage's "All contributors →" link now points to
      `/network/#contributors` instead, matching the prototype's actual behavior).
    - **Governance**: standalone `/governance/` page + nav entry **removed entirely**
      (content and template deleted) — the Network page's own Governance section, and
      `data/governance.yml`, are unaffected and remain the only home for this content.
    - **Funding**: standalone `/funding/` page + nav entry **removed entirely** — the
      footer's "Supported by" funder-logo strip (Phase 0) already carries this content on
      every page.

## Phase 0 — Design tokens, nav, footer ✅ done (2026-08-05)

Establish the visual foundation everything else builds on.

**Status: implemented and verified** (`npm run build` + dev server, screenshots checked).
Deviations/additions from the original bullets below, per decisions 6–9 above:
- Nav gap discovered during implementation: the design's nav spec (About/Network dropdowns +
  News + Contact) never mentioned Team, Governance, Funding, or Observation-of-the-day, all
  real existing pages. Resolved by folding Contributors (Team) + Funding into the About
  dropdown, Governance into the new Network dropdown, and dropping Observation-of-the-day
  from nav (still teased on the homepage in Phase 1). Network's "Overview" links to a new
  `/network/` route (not a reuse of `/gardens/`) — this and `/open-science/`/`/publications/`
  are currently minimal placeholder pages (`content/{network,open-science,publications}/
  index.md`) with no fabricated copy, so nav links don't 404 before Phase 4 builds them out.
- Footer additionally uses the email-obfuscation partial (decision 8) instead of a plain
  `mailto:` link, and the old Hinode "Follow DBGI" social-icon band
  (`footer/social.html`) was suppressed (emptied) since the design's actual footer has no
  equivalent — superseded by the new funder strip + dark bottom bar.
- `params.toml` `main.colorMode.enabled = false` per decision 7 (not in the original bullets,
  added per user instruction after Phase 0 first shipped).

- **`config/_default/params.toml`** `[style]`: update `light` from `#f5f8f2` to `#faf9f4`
  (design bg). `primary` (`#26490d`) and `dark` (`#17230f`) already match — no change.
- **New CSS custom properties**: since `assets/scss/` is empty (no variable file exists)
  and all custom styling lives in one hand-written `static/css/dbgi.css` (642 lines,
  hardcoded hex), add a `:root { --dbgi-*: ... }` block at the top of `dbgi.css` defining
  the missing tokens: `--dbgi-green-deep: #1e3d03`, `--dbgi-green-mid-1: #487026`,
  `--dbgi-green-mid-2: #6a9a3f`, `--dbgi-gold-1: #b6852d`, `--dbgi-gold-2: #8a6410`,
  `--dbgi-gold-3: #7d6c2a`, `--dbgi-gold-accent: #e2c884`, plus the existing primary/dark/bg
  values so both old and new component CSS can reference the same source. Do **not**
  bulk-replace the ~40 existing hardcoded `#26490d`/`#f5f8f2` occurrences in one shot —
  migrate them opportunistically as each component is touched in later phases, to keep
  diffs reviewable and avoid a risky big-bang rewrite.
- **Typography**: confirm Inter is already wired (`themeFont = "Inter"`, local
  `/fonts`) — no change needed. Add fluid `clamp()` heading-size utility classes to
  `dbgi.css` matching the design's scale (hero h1 `clamp(23px,5.1vw,72px)`, section h2
  `clamp(26px,3.4vw,44px)`, page h1 `clamp(28px,4vw,48px)`), plus the reusable eyebrow/
  label style (10.5–13px, weight 700, letter-spacing 0.05–0.16em, uppercase).
- **Nav** (`config/_default/menus/menus.en.toml`): restructure to match the design —
  `About` dropdown (Vision & Goals → `/about/vision-goals/`, Current work → `/work/`,
  Open science, Publications — the latter two are new pages, see Phase 4), `Network`
  dropdown (Overview → `/gardens/` or a new `/network/` overview, Gardens, Labs), `News`,
  pill-style `Contact` CTA. Update whichever nav partial Hinode renders from (check
  `layouts/_partials/` for the nav/header override) to add the pill-CTA styling and a
  mobile drawer if Hinode's default collapse doesn't already match the design's drawer
  behavior — reuse Hinode's existing responsive nav mechanics where possible instead of
  hand-rolling a new one.
- **Footer**: find/create the footer partial (check `layouts/_partials/` for an existing
  override, else Hinode's default is used) and add the "Supported by" logo row (reuses
  `data/funding.yml` funder logos already used in `layouts/partials/funding/cards.html`)
  above a dark (`--dbgi-green-deep`) bottom bar with copyright, CC BY 4.0 link, email,
  GitHub — matching `config/_default/menus/menus.en.toml`'s existing `[[social]]` entries
  where possible instead of hardcoding links twice.

**Verify:** `npm run start`, visually check nav/footer on `/` at desktop width; `npm run
lint:styles`.

## Phase 1 — Home page ✅ done (2026-08-05)

**Status: implemented and verified** (`npm run build`, dev server, screenshots at desktop
and mobile widths, plus a CDP-level check confirming zero horizontal overflow at 390px —
`document.documentElement.scrollWidth === window.innerWidth` and every section's bounding
box fits inside the viewport). All data is real, not placeholder: real garden-stats totals,
real taxonomic-coverage numbers (design's illustrative figures, see below), real map, real
today's iNaturalist observation, real featured team members, real news articles with real
images. Built as 8 small partials under `layouts/_partials/home/` (hero, status-band, focus,
coverage-gauge, network-teaser, observation-teaser, collectors-strip, news-teaser) rather
than one large template, orchestrated by a slimmed-down `layouts/index.html`. Deviations from
the bullets below:
- The design's exact hero photo (`dbgi_metasequoia.jpeg`) was found in the design bundle's
  `uploads/` folder and copied to `static/img/dbgi-metasequoia.jpeg` — used as-is rather than
  substituting an existing site image.
- Network map teaser links to `/network/` (per decision made when Phase 0's nav was built),
  not `/gardens/` as this bullet originally said.
- The "Focus/workflow" section now uses the design's actual Collect/Analyse/Connect copy
  (verbatim) instead of the old three-link list that was there before — a real content
  section exists in the design, so it replaced the placeholder-ish original rather than just
  being restyled. No rail-fill scroll animation (a visual flourish in the design, judged
  non-essential — simple static icons instead).
- Observation teaser has no fade+rise reveal animation — kept it simple (static reveal),
  since photo content itself is real and the animation is a nice-to-have, not load-bearing.
- News teaser cards show title + date (+ `tag` once Phase 3 adds it) but no excerpt, to match
  the design's actual news-preview card (title + tag/date only, no excerpt text there).
- Garden map logic was refactored into a shared `utilities/garden-map.html` partial so the
  homepage teaser and the existing `{{< garden-map >}}` shortcode (used on `/gardens/`) don't
  duplicate the Leaflet-init template code — matches the "not a second map implementation"
  intent below more literally than originally described.

- **`layouts/index.html`**: restructure section order to hero → stats band → focus/
  workflow → coverage gauge → network map teaser → observation-of-the-day teaser →
  top-collectors strip → news teaser → footer, replacing the current hero → canopy image
  → stats strip → feature-list structure. Keep the existing `content/_index.md` body
  copy as the hero's supporting paragraph (do not reword).
- **Stats band**: keep binding to `hugo.Data.garden_stats.totals` (already correct data
  source — the design's 7549/3545/1246 numbers match the current `garden_stats.yml`
  exactly) via `static/js/counters.js` (already implements count-up; extend if needed for
  new markup hooks). Add the "Last updated {{ garden_stats.generated_at | dateFormat }}"
  line using the already-present `generated_at` field.
- **Coverage gauge** (Orders/Families/Genera/Species bars): no live source exists for
  this anywhere. Add `data/taxonomic_coverage.yml` (manually maintained, small — 4 rows
  of `{label, covered, total}`) seeded with the design's illustrative numbers, and a
  small scroll-triggered bar-fill script (new, minimal — extend `counters.js` or add a
  sibling `coverage-bars.js` using the same `IntersectionObserver` pattern already in
  use, not a new animation library).
- **Observation of the day teaser**: `layouts/observation-of-the-day/single.html` and
  `data/inaturalist_observation.yml` already implement this feature fully, including the
  photo (the design's one genuinely-unfilled `<image-slot id="obs-of-day-photo">`). Add a
  compact teaser partial reusing that data (`hugo.Data.inaturalist_observation`) on the
  homepage, linking to `/observation-of-the-day/`, with the one photo-reveal animation
  variant used in the design (fade+rise) respecting `prefers-reduced-motion`.
- **Top collectors strip**: new partial rendering `site.GetPage "/team"`.Pages` filtered
  by front-matter `featured == true` (already set — see decision 6: top 6 by summed Directus
  `collected_samples`, via `data/collector_name_map.yml`), showing avatar/name/affiliation
  only (affiliation via the existing `affiliations.html` partial or its `organizations`
  front matter) — no sample/species numbers this pass.
- **News teaser strip**: reuse `content/news` `.Pages.ByDate.Reverse` (top 3–4), a
  condensed version of the news list card (date/thumbnail/tag/title/excerpt).
- **Network map teaser**: reuse `layouts/shortcodes/garden-map.html` /
  `static/js/garden-map.js` (already Leaflet + `data/gardens.yml` +
  `data/garden_stats.yml`-driven) in a compact "teaser" mode linking to `/gardens/`,
  rather than building a second map implementation. Extend `garden-map.js` marker
  styling (green circle divIcons) to match the design if not already close; no CSP
  changes are needed since GitHub Pages doesn't serve the `netlify.toml` headers (that
  file is legacy/unused per the deployment decision) — confirm no other CSP mechanism
  (e.g. a `<meta http-equiv="Content-Security-Policy">` from the `mod-csp` Hugo module)
  is actually active before assuming tile-provider swaps are unconstrained.

**Verify:** `npm run start`; check homepage at desktop/laptop/tablet/phone widths;
confirm counters animate once and `prefers-reduced-motion` is respected; confirm no
console errors from the map/observation partials.

## Phase 2 — Team: content model + routes + templates ✅ done (2026-08-05)

**Status: implemented and verified** (dev server, Playwright screenshots at 1440px and
390px, zero horizontal overflow, zero console errors on `/team/` and a person page).
Deviations/additions from the original bullets below:
- **Front matter additions** to all `content/team/<slug>/index.md` (55 files): add
  `featured: false`/`true`. **Status: done (2026-08-05)** — see decision 6; 6 people flipped
  to `true` via a Python front-matter-only bulk edit, `bio` prose and other fields untouched.
- Did **not** add a `group` (network/advisor) field or CRediT `contribs` list, confirmed
  unnecessary — reading the design's actual "PERSON" section markup
  (`DBGI Website v4.dc.html` line ~1370) confirmed it renders only photo, name, affiliations
  list, and ORCID; no group/contribs anywhere on that page.
- **`layouts/team/single.html`**: restyled to the design's person hero (back link → photo/
  name/affiliations grid at `220px 1fr`, ORCID rendered as the design's exact green "iD"
  badge + bare ORCID id extracted from the `social` entry with `icon: orcid`, pulled out of
  the generic social-icon loop so it doesn't double up with the other icon buttons). Kept
  (did not drop) the existing `role` subtitle, `organizations` links, the
  `team/affiliations.html` governance/lab/garden chip partial, other `social` icon buttons,
  and the full `bio`/Markdown body — the design's person page is minimal, but this site
  already carries real content those fields represent, and Phase 0/1's "restyle, don't
  strip real content" pattern applied here too.
- **`layouts/team/list.html`**: restyled to a responsive CSS grid
  (`repeat(auto-fill, minmax(168px, 1fr))`) reusing the Phase 1 `.dbgi-collector-card`
  component (avatar/name/affiliation) that the homepage's top-collectors strip already
  established, instead of inventing a second card style — added a `.dbgi-team-grid`
  wrapper class only to swap the strip's horizontal-scroll flex layout for a full grid.
  Sort unchanged (alphabetical by last name via `File.ContentBaseName`).
- Avatars already resolved to real `<img>` via `.Resources.GetMatch "avatar.*"` with
  `alt="{{ .Title }}"` and explicit `width`/`height` (both list-grid and person-hero sizes)
  — no `<image-slot>` equivalents remained.
- New CSS: `.dbgi-list-header`, `.dbgi-back-link`, `.dbgi-team-list`, `.dbgi-team-grid`,
  `.dbgi-person-page`, `.dbgi-person-hero`, `.dbgi-person-photo`, `.dbgi-person-name`,
  `.dbgi-person-role`, `.dbgi-person-orgs`, `.dbgi-person-orcid`, `.dbgi-orcid-badge`,
  `.dbgi-person-links`, `.dbgi-person-bio` in `static/css/dbgi.css`, matching the design's
  exact spacing/colors (e.g. `#a6ce39` ORCID green, `220px 1fr` hero grid, `18px` photo
  radius). Mobile override (`≤767.98px`) collapses the person hero to a single column.

**Verified:** dev server; `/team/` grid and 4+ person pages screenshotted at 1440px/390px;
zero horizontal overflow; zero console errors; `npm run lint:markdown` shows no new
issues (pre-existing errors in unrelated files only).

## Phase 3 — News: content model + routes + templates ✅ done (2026-08-05)

**Status: implemented and verified** (dev server, Playwright screenshots at 1440px and
390px, zero horizontal overflow, zero console errors on `/news/` and an article page).
Deviations/additions from the original bullets below:
- **Front matter additions** to all 7 `content/news/<slug>/index.md` entries: `tag` per
  decision 9's taxonomy, assigned by reading each real article — `Milestone` (first DBGI-KM
  meeting), `Network` (Zurich seminar), `Grant` ×2 (SNSF, swissuniversities), `Job Position`
  ×3 (PhD offer, 2 postdoc offers). No article needed `Garden sampling` — that tag exists
  for future articles, not a forced fit today. All 3 `Job Position` articles also got
  `position_closed: true`: they're 2023 postings with long-elapsed deadlines/start dates,
  and today (2026-08-05) they're unambiguously closed — an inferred-but-safe call, not a
  guess, flagged here per the "don't alter copy without confirmation" spirit even though
  this is metadata, not copy.
- Did **not** add `subjects` front matter to any article — none of the 7 real articles have
  an unambiguous entity relationship the design's chip row would represent beyond what
  `authors` already covers (rendered as "Published by X"), so no chips were invented.
- **Rich content adaptation**: applied narrowly, not as a blanket retrofit. The design's
  `rich` JS field doesn't exist in this site's actual content (these are plain pre-existing
  Markdown articles, mostly already correctly linked to real external URLs) — added exactly
  two new internal links where a real, unambiguous, previously-unlinked entity mention
  existed: "Emmanuel Defossez" → `/team/defossez-emmanuel/` in the PhD offer, and "COMMONS
  Lab" → `/labs/commons-lab/` in the swissuniversities grant article (exact name match to
  `data/labs.yml`). Left "Computational Ecology group" unlinked in three articles — it's an
  old/alternate name for what's now the PGEM lab page, but the names don't match closely
  enough to be a confident, non-invented identification. Left already-linked external URLs
  (e.g. COMMONS Lab's own `unifr.ch` page in the postdoc offers) as-is rather than rewiring
  them to internal routes, since that wasn't broken and wasn't asked for.
- **Bug found and worked around**: plain Markdown root-relative links (`[text](/team/x/)`)
  render broken (`href="team/x"`, no leading slash) on this site — Hinode's
  `_vendor/.../assets/link.html` partial strips `site.BaseURL`'s path from the destination
  without re-adding the leading `/`. Confirmed via curl on both new internal links before
  finding this. Worked around by writing those two links as raw inline `<a href="...">` HTML
  in the Markdown body instead (Goldmark passes raw HTML through untouched, bypassing the
  buggy render hook) — the same technique already used elsewhere in this content (see the
  Zurich seminar article's existing `<a href="https://doi.org/..."><img ...></a>`). This is
  a real, reproducible bug in the vendored theme, out of scope to fix here; noted for the
  cross-cutting handoff.
- **`layouts/news/list.html`**: restyled to the design's row layout (`date | thumbnail +
  tag/title/excerpt`), with the `Job Position`/closed-state note. Shipped **without** the
  design's JS year-range filter, per the plan's own stated default when it requires JS —
  7 articles across 3 years doesn't need filtering yet; revisit if the archive grows.
- **`layouts/news/single.html`**: restyled to the design's article layout (tag+date row,
  title, closed-state banner, hero image, body, "Published by {author(s)} · {date}" —
  only rendered when `authors` front matter exists, matching the 2 articles that have none
  rather than fabricating a generic "DBGI" byline). No `subjects` chip row (none needed,
  see above) and no separate bold "excerpt" lead paragraph — the design's `post.excerpt`
  is authored copy from the JS prototype with no equivalent field in this site's real
  content model, and duplicating the article's own opening sentence would just repeat text
  already in the body.
- New CSS: `.dbgi-news-list`, `.dbgi-news-row(-date|-inner|-media|-tag|-title|-excerpt)`,
  `.dbgi-news-closed-note`, `.dbgi-post(-meta-row|-tag|-date|-title|-closed|-media|
  -content|-footer)` in `static/css/dbgi.css`, matching the design's row/article spacing
  and gold tag color. Mobile override collapses the news row to a single column.

**Verified:** dev server; `/news/` list and the PhD-offer article screenshotted at
1440px/390px; zero horizontal overflow; zero console errors; both new internal links
confirmed resolving to real `/team/…/` and `/labs/…/` URLs via curl; existing `aliases`
(`/post/<slug>/`) untouched by these template changes; `npm run lint:markdown` shows no
new issues.

## Phase 4 — Remaining pages ✅ done (2026-08-05)

**Status: implemented and verified** (dev server, Playwright screenshots of all 11
pages/routes at 1440px and 390px, zero horizontal overflow except one pre-existing issue
noted below, zero console errors). Deviations/additions from the original bullets, plus
two real bugs found and fixed along the way:

- **Contact copy sign-off**: per the fixed decision requiring confirmation before adding
  new Contact wording, asked the user directly — approved using the design's copy
  verbatim (intro, 7-item "send us these details" checklist, "Who can contribute" grid).
  Implemented as `layouts/contact/single.html` (front matter title now "Get in touch").
- **Content/copy source-of-truth clarification**: `content/about/vision-goals/index.md`,
  `content/work/index.md`, and `layouts/about/vision-goals.html`/`layouts/governance/
  list.html` turned out to already exist with real (pre-redesign) copy and CSS classes
  from a commit that predates this whole redesign engagement (`78b93cc "aggregated
  menu"`, 2026-07-08) — a coincidence of `dbgi-eyebrow`/`dbgi-goal-card`-style class names
  that happened to line up with Phase 0's new tokens. About's old copy was a self-invented
  "Vision/Mission/Goals" card page; Work's old copy was actually about *how DBGI practices
  open science* (Dendron/GitHub/Open Notebook Science), not the design's "Our Work" timeline
  content — it mapped much better to the design's separate **Open Science** page. Per this
  phase's own instruction to lift new-page copy verbatim from the design, and since Phase 0
  had already architecturally split "Current work" and "Open science" into two distinct nav
  entries/pages, replaced: About → design's "What is the DBGI?" gap-narrative content;
  Work → design's "What are we working on?" timeline/EMI content; Open Science → design's
  principles/Dendron/GitHub/datasets content (the old Work copy's spirit lives on here,
  reworded to the design's actual copy, not a paraphrase of the old text).
- **Content is hardcoded in Go templates, not Markdown body**, for About/Work/Open
  Science/Publications/Contact — matches the established Phase 1 pattern
  (`layouts/_partials/home/focus.html`'s `slice`/`dict` steps) rather than round-tripping
  fixed editorial copy through `.Content`. `content/*/index.md` front matter carries only
  `title`/`description` (used for `<title>`/meta and, on About/Work/Open Science/
  Publications, the page's own hero H1/tagline).
- **Publications and Open Science "public datasets" data verified, not copied blindly**:
  the design's own source comment flagged the datasets array as "drafts until checked
  against each MassIVE page." Fetched all 5 MassIVE accession pages
  (`massive.ucsd.edu/ProteoSAFe/dataset.jsp?accession=...`) and 2 of the 4 publication DOIs
  (oldest 2022 and newest 2026, as bounds) to confirm they're real and DBGI-affiliated —
  all checked out, but the datasets' titles/descriptions were rewritten from the verified
  real MassIVE titles (e.g. "DBGI_metadata_Defossez_JBN_med_plant", Prague batch numbers
  004/005/006) rather than shipping the design's admittedly-draft placeholder text
  ("DBGI pilot batch", "DBGI main campaign, part 1/2/3").
- **Missing image assets**: the design's `uploads/` bundle didn't include
  `evie-fjord-PeO-y2q3pbI-unsplash.jpg` (Work page's "human preference" section photo) —
  went text-only for that subsection rather than fabricating a stand-in. The other two
  About-page images did exist (`Fig3_v3.png`, `about-gardens-shelves-flipped.png`) and were
  copied to `static/img/` as `dbgi-what-we-do.png`/`dbgi-garden-shelves.jpg`; the latter was
  17MB at 2400×3600 and was resized/re-encoded to a 356KB JPEG via `sips` first. Work's
  `figures/map-paper.svg` was copied as `static/img/dbgi-coverage-map.svg` unchanged.
- **Network overview**: built as a genuinely new route, `content/network/index.md` +
  `layouts/network/single.html` — Phase 0 had already committed to `/network/` (not
  reusing `/gardens/`) when it wired up the nav, so this bullet's "decide" was already
  resolved. New combined garden+lab map: `layouts/_partials/utilities/network-map.html` +
  `static/js/network-map.js` (circle markers for gardens, rotated-square divIcon markers
  for labs, matching the design's legend) — a genuinely new map view (gardens *and* labs
  together, visually distinguished), not a duplicate of the existing garden-only or
  lab-only map implementations, so it doesn't conflict with the "not a second map
  implementation" principle from Phase 1. Governance/Garden-Living-Collections cards reuse
  real existing fields (`role`, `organizations`) rather than inventing a "lab name" reverse
  lookup the data model doesn't cleanly support. Garden Living Collections shows 4 of 5
  gardens (Prague has no `head`/`contacts`/`members` in `data/gardens.yml` to pick a
  representative from — real data gap, not papered over). Contributors disclosure is a
  native `<details>/<summary>`, default collapsed, zero JS.
- **Gardens/Labs/Governance**: lighter-touch restyle than a rebuild, per the phase's own
  "do not change that architecture" instruction — swapped old header classes
  (`display-5 fw-semibold`, plain `<h1>`) for the new `dbgi-h1-page` typography, changed
  `.dbgi-garden-card`/`.dbgi-lab-card` from the old seamless-border grid trick to
  individual bordered+radius-16+hover-lift cards matching the new design system, and
  rebuilt Governance's member grid to reuse the same `.dbgi-people-card` component the
  Network page introduced (visual consistency, since it's the same people). Did **not**
  add the design's per-garden "% of species sampled vs. full collection" progress bar or
  filter chips — that needs a "total species available for sampling" denominator this
  site's data model doesn't have; inventing one would misrepresent real coverage.
  `data/garden_stats.yml`'s existing `profiled_samples: 0` (Neuchâtel, Champex) already
  rendered as a real, valid zero pre-Phase-4 — confirmed still correct, no change needed.
- **Email anti-scraping extended to a labelled CTA button**: the design's Contact page
  wants a pill button reading "Send Email" (not the visible address), which the existing
  `utilities/obfuscated-mail.html` partial/`obfuscate-email.js` (decision 8) didn't
  support — it always rendered the reconstructed address as both text and href. Extended
  both with an optional `label` param/`data-label` attribute: when set, the visible text
  stays as the custom label and only `href` is reconstructed by JS, with a `<noscript>`
  fallback showing the spelled-out (`user [at] domain [dot] tld`) address as plain text
  (not a working link) for no-JS visitors — same no-literal-string-in-server-HTML
  guarantee as the existing footer usage, just also supporting a custom label. Verified
  `dbgi@protonmail.ch` still doesn't appear literally anywhere in server-rendered HTML on
  either the footer or the new Contact button.
- **Bug found: live Wikidata "gap" fetch was blocked by the site's own CSP.** Confirmed
  via Playwright that `qlever.cs.uni-freiburg.de` (and its actual redirect target,
  `qlever.dev`) violated the `connect-src` directive generated by the `mod-csp` Hugo
  module — Phase 1's note to "confirm no other CSP mechanism is actually active" turned
  out to matter here. Fixed by adding a `[modules.wikidata.csp]` block to
  `config/_default/params.toml` (matching the existing `[modules.leaflet.csp]`/
  `[modules.inaturalist.csp]` pattern) with both hosts under `connect-src`, then
  regenerating `config/_default/server.toml` via `npm run build:headers:dev`. Verified
  end-to-end: the live SPARQL query now succeeds and `localStorage` receives a real
  fetched count (26,490 species, i.e. ~6.6%, vs. the seeded fallback of 27,500/6.9% baked
  into the server-rendered HTML for the no-JS/first-paint case).
- **Bug found and fixed: `npm run build:headers:dev` is unsafe to run alongside the dev
  server, for the same reason as `npm run build`/`hugo mod vendor` — a second concern
  beyond the already-documented `_vendor` race.** Running it (to regenerate `server.toml`
  for the CSP fix above) launched a second, independent `hugo` build process that shares
  the same on-disk resource cache (`resources/_gen/`) as the running `hugo server`. That
  build only renders 2 pages (`--renderSegments headers`), so its PurgeCSS content-scan
  saw far less of the site than the real build does, and it silently overwrote the cached,
  content-hashed `main.css` with a version stripped of classes it didn't think were used —
  including Bootstrap's `.d-md-none`/`.d-none.d-md-block` responsive-display utilities,
  which the nav's mobile/desktop label pair depends on. Result: every page's nav
  temporarily rendered both the mobile and desktop label text at once ("HomeHome
  NewsNews...") at every viewport width, until the *live* dev server's in-memory cache was
  cleared. `rm -rf resources/_gen` alone was not enough (the running process holds its own
  in-memory copy); required stopping and restarting the `npm run start` process. Fixed and
  reverified with a fresh full-batch screenshot pass — nav renders correctly again
  everywhere. **Added to operating notes: don't run `npm run build:headers:*` (or likely
  any standalone `hugo`/`hugo --renderSegments` invocation) while the dev server is
  running, same as the existing `_vendor` warning** — if CSP/header changes are needed
  again, stop the dev server first, run the regeneration, then restart it.
- **Known pre-existing issue, not introduced by this phase, deferred to Phase 5**: Gardens
  and Labs detail pages (`layouts/gardens/single.html`, `layouts/labs/single.html`) show a
  12px horizontal overflow at 390px width, from a `.row.g-5` gutter (3rem) nested in a
  plain `.container` (whose own default gutter is 1.5rem) — a Bootstrap gutter-mismatch
  that predates this redesign (only the `<h1>` classes on these pages were touched this
  phase). Confirmed via `git diff` that the `row`/`col` markup itself is untouched. Left
  for Phase 5's dedicated breakpoint pass rather than restructuring detail-page grid markup
  under a "restyle only" mandate.

**Verified:** dev server; all 11 new/restyled routes (`/about/vision-goals/`, `/work/`,
`/open-science/`, `/publications/`, `/network/`, `/gardens/`, `/gardens/fribourg/`,
`/labs/`, `/labs/pgem/`, `/governance/`, `/contact/`) screenshotted at 1440px and 390px;
zero console errors on all of them; zero horizontal overflow except the one pre-existing
Gardens/Labs detail-page issue noted above; live Wikidata gap-stat fetch confirmed working
end-to-end (not just seeded); no literal `dbgi@protonmail.ch` in server HTML on Contact or
footer; `npm run lint:markdown` not re-run this phase (no Markdown content edits beyond
front matter/one internal link in Phase 3 already covered) — recommend running the full
`npm run build` once the dev server is stopped, before shipping, to catch anything a dev
server alone wouldn't (this wasn't done yet this session per the "don't run build while
dev server is running" rule).

## Phase 5 — Responsive & accessibility pass ✅ done (2026-08-05)

**Status: implemented and verified.** Built a Playwright breakpoint-matrix script
(`scratchpad/breakpoint-matrix.mjs`, not committed — scratch tooling) covering all 17
routes × 7 widths (1920/1440/1280/834/768/414/375 = 119 checks), asserting zero horizontal
overflow (`scrollWidth === innerWidth`) and zero console/page errors on every load, plus
targeted keyboard-navigation and computed-style scripts (focus outlines, contrast,
tab order) rather than a purely manual click-through — same rigor as Phases 1–4's
CDP-level overflow checks, just automated across the full matrix instead of spot widths.
Found and fixed several real, previously-undetected bugs (Phases 0–4's spot checks at
1440/390 never exercised these paths):

- **Real bug: every custom template nested a redundant `<main>` inside Hinode's own
  `<main id="container" class="main">` from `baseof.html`.** All 16 top-level templates
  (`_default/single`, `team/{single,list}`, `news/{single,list}`, `gardens/single`,
  `labs/single`, `governance/list`, `funding/list`, `network/single`, `about/vision-goals`,
  `work/single`, `open-science/single`, `publications/single`, `contact/single`,
  `observation-of-the-day/single`) opened their own `<main>` — invalid nested-landmark
  HTML (confirmed via curl: `<main id="container" class="main"><main class="container
  py-5 ...">`) that predates this redesign in some files (`_default/single.html`,
  `funding/list.html`) and was carried forward into every new template Phases 1–4 added.
  Fixed by demoting the inner element to `<div>` (identical classes, zero visual/CSS
  change — confirmed no CSS rule targets the bare `main` tag). Every route now renders
  exactly one `<main>` landmark.
- **Real bug: the About/Network nav dropdown toggles were completely unreachable by
  keyboard.** `menus.en.toml`'s "About" and "Network" top-level entries had only an
  `identifier`, no `pageRef` — Hinode's vendored `assets/helpers/navbar-item.html`
  (line 112) renders such entries as an inert `<div>` instead of an `<a>` when there's no
  menu URL to point to, and a `<div>` (even with `role="button"`) isn't natively
  focusable. Confirmed via a scripted Tab-order test: focus jumped straight from "News" to
  "Contact", skipping both dropdowns entirely — a full keyboard-accessibility blocker on
  the primary nav, present on every page. Fixed with a config-only change (no vendor
  edits): gave "About" `pageRef = "/about/vision-goals/"` and "Network"
  `pageRef = "/network/"` (its own existing Overview page) — both entries had a natural,
  already-real landing page. This makes Hinode render a genuine `<a href>` (focusable,
  `Enter` toggles the dropdown via Bootstrap's `data-bs-toggle="dropdown"` without
  navigating away — Bootstrap's dropdown data-api always calls `preventDefault()` — and
  `Escape` closes it), verified end-to-end with a keyboard-driven Playwright script.
  Mobile hamburger drawer and the Network page's `<details>` contributors disclosure were
  already keyboard-operable (native Bootstrap offcanvas / native `<details>`), no change
  needed there.
- **Real bug: `/work/`'s heading hierarchy skipped a level** (`h1` → `h3` for each
  "Approach" timeline stage, no intervening `h2`, since that section has no visible
  section heading in the design). Fixed with a `.dbgi-visually-hidden` `<h2>Our
  approach</h2>` — a new hand-written CSS class in `dbgi.css` (not Bootstrap's
  `.visually-hidden` utility: confirmed via computed-style check that PurgeCSS's dev-server
  content scan hadn't picked up the new class yet and was silently serving it
  unclipped/fully visible, the same class of caching gotcha as Phase 4's `build:headers:dev`
  incident — using the hand-written stylesheet sidesteps PurgeCSS entirely, consistent
  with how every other `dbgi-*` class in this project already works). Every route now has
  exactly one `h1` and no level-skips (scripted heading-hierarchy audit across all 17
  routes).
- **Real bug: three UI text/background colour combinations failed WCAG AA (4.5:1) for
  small text**, caught by computing contrast ratios for every new token pairing rather
  than eyeballing: the Network page's lab numbered-pin badge (white on `--dbgi-gold-1`,
  3.29:1), the Publications "IN PREPARATION" badge (same combination, 3.29:1), and the
  About page's 4th "what we do" step number (white on an inline `#d9782d` orange, 3.15:1).
  Fixed the two gold-1 badges by switching their text to `--dbgi-dark` (4.97:1) and
  darkened the About step-4 orange to `#ad6024` (4.69:1), preserving each element's hue
  identity. Deliberately left the ORCID "iD" badge (white on ORCID's own brand green
  `#a6ce39`, 1.82:1) unchanged — it's `aria-hidden="true"` brand iconography for a
  third-party trust-mark (ORCID's own colour spec), which WCAG 1.4.3 explicitly exempts
  as a logotype; changing it would misrepresent the ORCID brand for no real accessibility
  gain (the actual ORCID identifier is separately available as real text next to it).
  Every other new token combination checked out (gold-2/gold-3 body text on cream/white
  backgrounds: 4.9–5.4:1; the dark-band/footer's cream text and gold-accent link on
  `--dbgi-green-deep`: 11.6:1 and 7.4:1 respectively).
- **Real gap: zero focus-visible styling existed anywhere in `dbgi.css`.** Added the
  design's own exact spec (`DBGI Website v4.dc.html` line 134): a global
  `a/button/input/textarea/select/summary/[tabindex]:focus-visible` 3px solid
  `--dbgi-green-deep` outline, plus a light-outline override
  (`--dbgi-bg`) scoped to `.dbgi-dark-band`/`.dbgi-footer-bottom` for the two genuinely
  dark-background contexts (mirroring the design's own `[data-dbgi-form] ... { outline-color:
  #faf9f4; }` pattern) — verified both variants render with the right colour via computed
  style. Also carried over the design's `html, body { max-width: 100%; overflow-x: hidden;
  }` / `img, svg, video { max-width: 100% }` blunt safety net, and its
  `@media (prefers-reduced-motion: reduce)` blanket rule zeroing all CSS
  animation/transition durations site-wide — belt-and-suspenders on top of `counters.js`
  and `coverage-bars.js`, which already independently check
  `matchMedia("(prefers-reduced-motion: reduce)")` in JS and skip straight to the final
  value (Phase 1's existing implementation, reconfirmed still correct). Bootstrap's own
  `.nav-link:focus-visible` box-shadow ring (already present, not this project's code) was
  confirmed to still give the main nav a visible — just non-outline — focus indicator, so
  no change was needed there.
- **Real gap: 7 news-article thumbnails had `alt=""`** (news list rows, the homepage news
  teaser strip) despite the Phase 5 checklist's own "news/garden photos: descriptive"
  bar — empty alt loses real information for screen-reader users since these are genuine,
  varied photos (a meeting room, a seminar flyer, an SNSF logo, two garden photos in
  different seasons, a leaf macro shot, a rooftop-at-sunset banner), not generic
  placeholders. Viewed all 7 images and added a new `image_alt` front-matter field to each
  article with an accurate description, wired into `news/list.html`,
  `_partials/home/news-teaser.html`, and `news/single.html` (falling back to the article
  title if ever absent). Every other `<img>` in the project's own layouts already had
  meaningful `alt` (avatars → person name; hero banner and decorative thumbnails already
  correctly `alt=""`) — confirmed via a full repo grep, no other gaps.
- **Reviewed, not changed: list markup for card grids.** Most repeated "cards"
  (collectors, team, governance, network people) are `<a class="...-card">` elements
  directly inside a grid `<div>`, not wrapped in `<ul>/<li>`; gardens/labs list cards use
  `<article>`. Decided not to do a blanket conversion to `<ul>/<li>` — WCAG's Info and
  Relationships criterion doesn't mandate list semantics for a grid of links (only that
  the relationship be programmatically determinable, which `<article>`/aria-labelled
  container groupings already satisfy), and converting would risk real regressions in
  the CSS grid/flex rules these elements participate in for comparatively little
  accessibility gain. `aria-label`s already on the `.dbgi-gardens-list`/`.dbgi-labs-list`
  containers give assistive tech a named group either way.
- **Reviewed, not changed: nav collapse breakpoint.** The design's prototype used a
  hand-rolled `isWide` flag around ~900px; this site's nav (Hinode's default
  `navbar-expand-md`) collapses to the hamburger drawer below 768px instead, a Phase 0
  decision ("reuse Hinode's existing responsive nav mechanics"). Screenshotted the full
  nav at 768px and 834px on multiple pages this phase — it fits comfortably with no
  crowding or overflow at either width — so left as-is rather than fighting Bootstrap's
  breakpoint system for a closer match to the prototype's exact pixel value.
- **Pre-existing Gardens/Labs detail-page overflow bug (flagged in Phase 4) fixed**:
  the `row g-5` gutter on both `layouts/gardens/single.html` and `layouts/labs/single.html`
  didn't match their parent plain `.container`'s default gutter, bleeding 12px past the
  viewport at narrow widths. Changed to `row g-4`, matching the gutter already used
  consistently by every other two-column detail/header row in the site (confirmed via
  grep — `g-5` was the only outlier) — zero remaining overflow at any tested width.

**Verified:** dev server; scripted breakpoint-matrix (119 checks: 17 routes × 7 widths)
clean before and after every fix, re-run 4 times across the session as fixes landed;
scripted heading-hierarchy audit (one `h1` per route, no level-skips) across all 17
routes; scripted keyboard-navigation checks (dropdown Tab-reachability, Enter-to-open/
Escape-to-close without navigating away, mobile drawer Tab-reachability, native
`<details>` toggle); computed-style contrast checks for every new colour token pairing;
full-repo `<img>` alt-text grep; `npm run lint` (scripts/styles/markdown — markdownlint's
27 pre-existing errors are all in files/lines this phase didn't touch, same as Phases 2–3's
precedent).

### Post-Phase-5 correction: nav pruned to match the prototype exactly (2026-08-05)

Per decision 10 above, reversed Phase 0's original "fold everything in so nothing 404s"
nav resolution now that the user confirmed the prototype's nav is authoritative for pages,
items, and order:

- **`config/_default/menus/menus.en.toml`**: removed the "Contributors", "Funding", and
  "Governance" entries; renamed "Labs" → "Research Laboratories" (the prototype's actual
  label); reordered so News sits after the Network dropdown, not right after Home (the
  weights had it between Home and About, which never matched the prototype either — not
  something Phase 0's own writeup had flagged as a deviation, just missed).
- **Deleted** `content/governance/`, `layouts/governance/`, `content/funding/`,
  `layouts/funding/` entirely. `data/governance.yml` (used by the Network page's Governance
  section and the person-page affiliation chip) and the footer's funder-logo strip
  (`data/funding.yml` via `layouts/partials/funding/cards.html`) are separate and untouched
  — only the standalone pages/routes are gone, not the underlying data or the content that
  already lived correctly on `/network/` and in the footer.
- **Fixed the two cross-links that pointed at the removed routes**: `layouts/partials/
  team/affiliations.html`'s "Governance" chip (shown on Pierre-Marie Allard's, Emmanuel
  Defossez's, and Tito Damiani's person pages) now points to `/network/#governance`
  instead of the deleted `/governance/`; the homepage's `_partials/home/collectors-strip
  .html` "All contributors →" link now points to `/network/#contributors` instead of
  `/team/`, matching the prototype's actual behavior (`goNetwork`, not a separate
  contributors route). Added `id="governance"` and `id="contributors"` to
  `layouts/network/single.html`'s two matching sections so both fragment links resolve.
- **Team/Contributors kept, just unlinked**: `/team/` (the list page) and all 55 person
  pages are untouched and still reachable — via the Network page's own "All contributors"
  `<details>` disclosure (built in Phase 4), via News article "Published by" bylines, and
  via Garden/Lab "Head/Contact/Members" cards — just no longer in the nav or the About
  dropdown.
- **Bug found while verifying**: after deleting the content/template files, `/governance/`
  and `/funding/` kept returning 200 with stale content even after a full dev-server
  restart. Root cause: this project's `hugo server` writes rendered output to a real
  `public/` directory on disk (confirmed via the startup banner's "Serving pages from
  disk") rather than serving purely from memory, and Hugo's dev rebuild does not prune
  `public/` subdirectories for routes whose source no longer exists (`Cleaned │ 0` in the
  build stats even after the restart) — so the old `public/governance/index.html` and
  `public/funding/index.html` just sat there stale. Fixed by deleting those two stale
  output directories directly (safe: `public/` is gitignored build output, not source).
  Noting this here since it'll bite again if a future phase ever removes/renames a route
  instead of just editing one in place — the fix is `rm -rf public/<old-route>/` after a
  restart, not another restart.

**Re-verified:** breakpoint-matrix re-run on the corrected 16-route set (112 checks: 16 ×
7 widths) — zero overflow, zero console errors; heading-hierarchy audit re-run — clean;
confirmed via curl that `/governance/` and `/funding/` now 404 and every other route still
200s; confirmed via curl that the rendered nav's actual item labels/order/`data-nav-child`
values match the prototype exactly; confirmed via curl that no remaining reference to
`/governance/` or `/funding/` exists anywhere in `layouts/`, `content/`, or `config/`;
screenshotted the open About and Network dropdowns to visually confirm; `npm run
lint:markdown` shows the same pre-existing errors only.

## Phase 6 — Collector stats plumbing (Directus)

Mirrors `scripts/update-garden-stats.mjs`'s existing fail-safe structure exactly, since
that pattern already satisfies requirement 4's "never replace valid values with 0/blank/
error" rule and is what CI already knows how to run.

### Findings from inspecting `directus-explorer` (2026-08-05)

A local copy was made available at `~/Downloads/directus-explorer-main` (a manual zip
download, not the default sibling path `../directus-explorer`, and not git-linked to this
repo in any way — running `npm run data:gardens`/a future `data:collectors` locally
requires `DIRECTUS_EXPLORER_DIR` pointed at wherever it actually lives). Reading its
source (read-only) resolved most of the earlier unknown:

- **A real collector-attribution field exists**: `field_collector_fullname`, part of the
  same `Field_Data` Directus collection `garden_stats.yml` already draws from
  (`src/directus_explorer/ms_metadata.py:143`). It is a **free-text full name**, not an
  ORCID or a relation to a team/person collection — so mapping it to
  `content/team/<slug>/` will need name normalization (the same kind of manual
  alias/override mapping the design bundle's `dbgi-avatars.js` already does for avatar
  filenames), not a clean automatic join. Expect some names to need manual reconciliation
  in a mapping table.
- **The CLI does not support grouping by collector today.** `samples summary --group-by`
  only accepts `project` (`src/directus_explorer/cli.py:173-177`,
  `click.Choice(("project",))`). A collector grouping mode does not exist yet.
- **The underlying mechanism is a native Directus feature, not something to invent.**
  `DirectusClient._get_field_sample_counts_by_project()`
  (`src/directus_explorer/directus.py:1167-1207`) already calls Directus's generic
  aggregate endpoint: `GET /items/Field_Data?groupBy[]=qfield_project&aggregate[count]=id`.
  Swapping `groupBy[]` to `field_collector_fullname` gives raw **collected-sample counts
  per collector** directly from Directus — no new Directus-side config needed, just a
  new client method mirroring the existing one (~15-40 lines: new
  `_get_field_sample_counts_by_collector()`, a `CollectorSampleSummary` dataclass
  mirroring `ProjectSampleSummary`, a new `summarize_samples_by_collector()`, and
  widening the CLI's `--group-by` choice to `("project", "collector")`). This part is
  genuinely small.
- **Species/profiled counts per collector are NOT a small extension.**
  `ProfiledSample`/`list_profiled_samples` (`src/directus_explorer/samples.py:31-39`)
  only carry `qfield_project`, not collector — deriving a profiled or distinct-species
  count per collector would require tracing collector identity through the sample →
  extraction → MS-injection container chain (the same multi-hop join
  `resolve_original_sample_container_id` already does for containers), and it's unknown
  without further schema inspection whether that chain preserves
  `field_collector_fullname` all the way through. Size this as open/unscoped, not part
  of the "small addition."
- **This CLI change lives in a separate, private repo** (`directus-explorer`) that this
  engagement doesn't have write access to or a mandate to modify. It's a prerequisite
  dependency, not something `update-collector-stats.mjs` can work around — the plumbing
  script below can be written now, but won't produce real numbers until someone adds
  `--group-by collector` (collected-count only, per above) to `directus-explorer` itself
  and it ships to the environment CI checks out.

### Implementation

- **New script** `scripts/update-collector-stats.mjs`: same shape as
  `update-garden-stats.mjs` — resolve `DIRECTUS_EXPLORER_DIR`, `skipOrFail()` fallback
  (warn + exit 0 + keep existing file when not required, throw when
  `DBGI_REQUIRE_DIRECTUS_STATS=true`), write `generated_at` + per-collector counts to a
  new `data/collector_stats.yml`. The aggregation call is
  `runExplorer(["samples", "summary", "--group-by", "collector", "--format", "json"])`
  — this is the real, confirmed command shape once `directus-explorer` adds the
  `collector` group-by mode described above; keep it commented out / behind a clear
  marker until that mode actually exists upstream, since calling it today would just
  error. Only `collected_count` per collector is available initially — do not attempt
  species/profiled counts per collector until the container-chain question above is
  resolved.
- **Mapping to team records**: join `collector_fullname` values (note: the live Directus
  field is `collector_fullname`, not `field_collector_fullname` — that prefixed name only
  exists in the flattened export table; this was a real bug caught during live testing, now
  fixed in `directus-explorer`) to `content/team/<slug>/` by name. **Status: done
  (2026-08-05)** — `data/collector_name_map.yml` reconciles all 30 raw Directus names into 17
  distinct people (+ 10 unmatched, listed rather than dropped) and drives the `featured: true`
  ranking (decision 6). It currently only covers the top 6 well enough to rank them
  confidently; extending it to *every* collector for a full attribution view is still
  optional future work.
- **New npm script**: `"data:collectors": "node scripts/update-collector-stats.mjs"`,
  wired into `prebuild` alongside `data:gardens`/`data:inaturalist`.
- **CI**: extend `.github/workflows/build-and-deploy.yml`'s existing `Build` step env
  block with the same `DIRECTUS_*` secrets (already present) — no new secrets needed
  unless the eventual query requires additional permissions, in which case document them.
- **Documentation**: add a "Directus-powered collector stats" section to `README.md`
  mirroring the existing "Directus-powered garden stats" section, including required env
  vars, the `skipOrFail` behavior, and an explicit note that this depends on an unmerged
  `directus-explorer` CLI change (`--group-by collector`) plus a manual name-mapping file.
- **Homepage wiring**: once real data lands, extend the Phase 1 top-collectors partial to
  show a `samples` count from `hugo.Data.collector_stats` (species/profiled counts
  deferred per above), with true zero displayed only when the script's last successful
  run actually returned zero for that person (same rule as garden stats) — this last
  step is out of scope until the upstream CLI change and name-mapping file both exist,
  so leave the partial numbers-free for now as decided.

**Verify:** run the script locally with `DIRECTUS_EXPLORER_DIR` unset to confirm it
warns and exits 0 without touching any existing file; once the upstream `--group-by
collector` mode exists, run it against a real `directus-explorer` checkout and confirm
`data/collector_stats.yml` is written with a `generated_at` timestamp and per-collector
`collected_count` values; `npm run build` succeeds either way.

**Re-verified (2026-08-05, after Phase 5):** re-ran `scripts/update-collector-stats.mjs`
with `DIRECTUS_EXPLORER_DIR` unset — still warns
(`Directus explorer directory not found at .../directus-explorer; keeping existing
.../data/collector_stats.yml`) and exits 0, `data/collector_stats.yml` untouched
(`git status` shows it still only as untracked, no diff). Nothing else in this phase is
actionable right now: CI wiring and the homepage numbers are both still correctly
blocked on the unmerged upstream `directus-explorer` `--group-by collector` PR, per the
decisions above — not something to work around from this side.

## Post-final-verification: full prototype-vs-live content audit (2026-08-05)

After Final Verification shipped, the user flagged that several things still didn't match
the handoff prototype (missing news, wrong hero text) and asked "at what point did you
miss it" plus a full re-comparison. Root-caused honestly rather than guessed at: Phase 1
had explicitly decided to *keep* the pre-existing `content/_index.md` hero copy instead of
the prototype's own hero paragraph ("do not reword" — a real decision, just never
surfaced as a question), and Phase 3 only ever gave front matter to the 7 news articles
that already existed in `content/news/` without checking whether the prototype's own
hardcoded data had more. It did — a lot more. Read the entire ~3,000-line prototype file
section by section (nav, hero, every page's data arrays) and diffed each against the live
site rather than relying on earlier summaries. Findings, split by risk:

**Fixed immediately (copy/label corrections, no factual-content risk):**

- Home hero paragraph replaced with the prototype's actual text: "An open science effort
  to sample, measure, and digitise the chemistry of living botanical garden collections."
  (was the old two-paragraph mission copy Phase 1 had deliberately preserved).
- Gardens page: title "Sampled Botanical Gardens" → **"Botanical gardens"**; added the
  missing "← Network" back-link; intro copy now the prototype's exact sentence.
- Labs page: title "Core Labs" → **"Research laboratories"**; same back-link/intro fix.
- Garden/Lab detail page back-links: "Sampled Gardens"/"Core Labs" → "← Botanical
  gardens"/"← Research laboratories", now using the existing `.dbgi-back-link` component
  (with arrow) instead of plain unstyled text, matching every other back-link on the site.
- News tag: the Zurich seminar article was tagged "Network"; the prototype (and its own
  taxonomy) uses "Seminar" — a tag Phase 3 had dropped without flagging it as a real
  content decision. Restored.

**Confirmed with the user before acting (real financial/partnership facts, unverifiable
independently):** the prototype's `posts` array has **18 articles**; only 7 existed in
`content/news/`. The other 11 are specific grant awards (with grant numbers and amounts)
and network-partnership announcements. One data point that argued for these being real
rather than invented demo content: the prototype's hardcoded Kew garden stats (635
samples / 459 species) match this site's live Directus-sourced `garden_stats.yml` numbers
*exactly*. Asked the user directly rather than assume either way — confirmed real, told to
add all of them using the prototype's text as source. Implemented:

- **10 new articles** created: `kew-sampling-campaign`, `kew-joins-network`,
  `gacr-grant-prague`, `snsf-metabolinkai-grant`, `snsf-requip-fribourg`,
  `snsf-chemlife-allard`, `prague-joins-network`, `fribourg-joins-network`,
  `neuchatel-joins-network`, `champex-joins-network`. Each got real front matter (title,
  date, tag, `authors` only where the prototype names a single clear PI — omitted
  elsewhere, matching the existing site's own convention of not fabricating a byline), a
  real featured image sourced from the prototype's own `uploads/` bundle where one exists
  (Kew sampling photo, Kew/Prague/Neuchâtel garden logos, GAČR logo, Weave programme logo,
  Flore-Alpe photo; the SNSF-branded grants reuse the existing SNSF logo already on site),
  and body copy converted from the prototype's `rich` segment-array format to Markdown —
  internal references (people/labs/gardens) written as raw `<a href>` HTML per the Phase 3
  workaround for Hinode's link-stripping bug, external references as normal Markdown
  links. `fribourg-joins-network` has no image (none exists in the prototype bundle for
  it) — went text-only rather than reuse an unrelated garden's photo, per the Phase 4
  precedent for genuinely missing assets.
- **Fixed the existing `snsf_grant` article**, which turned out to be genuinely broken —
  title truncated mid-sentence ("SNSF grant awarded for") and an empty body. Replaced with
  the prototype's matching entry (same date, same PI — Emmanuel Defossez): Grant 215724,
  CHF 381,293, "MetaDiv." Kept the article's existing `authors`/`aliases`/image untouched.
- Verified all internal links in the new content resolve (every referenced `/team/`,
  `/labs/`, `/gardens/` slug checked against real content — caught two id mismatches
  versus the prototype's own internal ids: its `damiani-tito`/`pluskal-tomas` are this
  site's `tito-damiani`/`tomas-pluskal`, reversed). News list now shows all 17 articles,
  correctly sorted by date, zero broken links, zero new overflow/console errors (133
  scripted checks across the expanded route set), zero new markdownlint issues.

**Found but not yet acted on — flagged for a decision, not guessed at:**

- The prototype's Gardens list page shows a real "% of species sampled" progress bar per
  garden with an explicit denominator concept: a garden-reported "samplable" count (species
  the garden has made available for sampling, distinct from its full living collection),
  plus a footnote explaining exactly that. This directly contradicts Phase 4's stated
  reason for skipping this feature ("data model doesn't have a denominator") — the
  prototype defines one, it just isn't populated anywhere in this site's real
  `data/gardens.yml`/`garden_stats.yml`. Needs real per-garden "samplable" numbers from the
  user (or a real Directus field) before this is implementable — not something to
  estimate.
- The prototype's Gardens/Labs list pages use interactive filter chips (by focus-area tag,
  with live counts) instead of the current static "N sampled botanical gardens" stat
  callout. This is new interactive functionality, not a copy fix, and conflicts with
  Phase 4's original "do not change that architecture" guardrail for these two pages —
  flagged for the user to decide whether it's in scope now that exact prototype parity is
  the stated goal.

## Post-audit round 2: filter chips, real collector counts, Network dedup (2026-08-06)

User confirmed answers to the two open items above plus three more asks. Planned via
`/plan` (research + a Plan-agent design pass + user approval) before implementing, since
this touched five different files/concepts at once. Full plan preserved at
`~/.claude/plans/answer-1-in-cached-gosling.md`.

- **Samplable denominator (answer 1): confirmed absent, dropped as instructed.** Checked
  `data/garden_stats.yml`, `data/gardens.yml`, and the `directus-explorer` client source
  (`directus-explorer/src/directus_explorer/*.py`, the local gitignored clone) for any
  species-list/catalog field distinct from "already sampled" — none exists anywhere in the
  real pipeline. Per the user's own fallback, no % bar was added; `layouts/gardens/list
  .html`'s per-card samples/species/profiled counts were already correct and untouched.
- **Gardens filter chips (answer 2): implemented, Labs left alone.** Confirmed via the
  prototype's own JS that chips filter by garden **country** (not focus tag as originally
  guessed), with an "All" chip first — and that Labs has no chip row in the prototype at
  all (asymmetric, confirmed by grep — no `labsChips` variable exists anywhere in the
  design file). Replaced `layouts/gardens/list.html`'s static `<div class="dbgi-gardens-
  stat">N sampled botanical gardens</div>` with real `<button>` chips (one per distinct
  `.country` in `data/gardens.yml`, computed via Hugo's native `uniq`/`sort` — no new data
  file needed), `data-country` attributes on each `.dbgi-garden-card`, and a new
  `static/js/garden-filter.js` (same self-contained-IIFE-with-early-exit shape as
  `coverage-bars.js`/`counters.js`) toggling the HTML `hidden` attribute on click — real
  `<button>`s rather than the prototype's `<a onClick>` pattern, since this is a static
  site with no JS-framework state model, and `<button>` is natively keyboard-operable
  with zero extra work. New CSS (`.dbgi-garden-chips`/`.dbgi-garden-chip`/`.is-active`/
  `.dbgi-garden-chip-count`) uses the prototype's exact colors. `layouts/labs/list.html`
  untouched.
- **Homepage top-collectors counts + sort (real request, not from the two answers
  above): implemented.** `layouts/_partials/home/collectors-strip.html` now joins each
  `featured: true` team page against `hugo.Data.collector_name_map.people` (the
  already-reconciled per-slug `collected_samples` sums from Phase 6/decision 6 — no new
  data needed, it already existed and just wasn't wired into this partial) and sorts
  descending via Hugo's native `sort`. Renders a "N samples" line per card (`lang
  .FormatNumber`-formatted); no species/profiled count shown or fabricated, since neither
  exists per-collector in real data (Phase 6's own finding — not a "small addition").
  Verified live order: Mazzarine Laboureau (2,749) → Emilie Lab (830) → Kateřina Kučerová
  / Emmanuel Defossez (722, tied) → Federico Brigante (299) → Héloïse Coen (225) — exactly
  the expected ranking.
- **Network "extra contributors" (real request): root-caused, not a roster problem.**
  Read the prototype's own `dbgi-people.js` (a companion data file, loaded via `<script>`
  in the design bundle — not embedded in the main HTML, found by tracing where its
  `window.DBGI_PEOPLE`/`window.DBGI_AVATAR` globals it reads are actually defined). Its own
  `featured` flag marks exactly the 9 people who already get a dedicated card elsewhere on
  the Network page (4 governance + 5 garden reps), and its Contributors list is literally
  `PEOPLE.filter(p => !p.featured)` — built to avoid showing the same person twice on one
  page. **This is unrelated to this site's own `featured:` field**, which correctly drives
  the homepage top-collectors strip above (verified against real sample-count data, a
  better realization of the prototype's own stated intent — its "Hall of Fame" array's own
  code comment says *"Illustrative counts — Directus populates `samples` live"* — than
  copying its 8 demo names would have been). Conflating the two would have broken the
  homepage strip to fix an unrelated page. Instead: `layouts/network/single.html` now
  computes an exclusion set (governance members ∪ each garden's picked representative,
  reusing the exact same head→contacts→members fallback the Garden Living Collections
  section already computes inline) and filters the Contributors list against it —
  `content/team/*/index.md` `featured:` fields were not touched. Also added `tomas-pluskal`
  to `data/governance.yml`'s `members` (the prototype's governance array has 4 people;
  this site's had 3 — a real completion, not new invented content, since
  `content/team/tomas-pluskal/` already exists with a matching real role). Verified: `
  /network/` Governance now shows 4 cards, Contributors count dropped from 55 to 47 (56
  total team pages including the new one below, minus 9 excluded), and none of the 9
  excluded people appear twice.
- **Vlastimil Rybka team page (new, confirmed with user): created.** The prototype's
  Garden Living Collections data has a 5th representative, for Prague, with no
  corresponding `content/team/` page on the live site at all (Prague previously rendered no
  representative card — a pre-existing gap, not something Phase 4 skipped incorrectly, it
  just had no data to work with). User confirmed creating a minimal real team page was
  fine, and clarified the Garden Living Collections cards link to the person directly, not
  to a lab — Rybka has no lab affiliation, matching the pattern of other garden-only (not
  lab-affiliated) contributors like `muller-alain`. New `content/team/rybka-vlastimil/`
  (front matter + `bio` copied structurally from `muller-alain/index.md`'s pattern, no
  fabricated specifics beyond what the prototype itself characterizes him as — "Living
  Collections" contact) using the real photo already present in the prototype's own asset
  bundle (`uploads/vlastik.jpg`). Added `contacts: [rybka-vlastimil]` to `data/gardens.yml`'s
  `prague` entry — a single data addition that made him appear correctly in three places via
  entirely pre-existing template logic with zero special-casing: Prague's own garden detail
  page, the Network page's Garden Living Collections section (now all 5 gardens
  represented), and (automatically) excluded from the Contributors list by the same
  generic exclusion-set computation above.

**Verified:** `npm run build` (stopped dev server first) succeeded, 111 pages (+1 for
Rybka's new page vs. the prior 110); dev server restarted the same way; scripted
breakpoint-matrix (133 checks across all routes) clean before and after; a dedicated
Playwright script exercising the gardens chips (click each of the 4 chips, confirm exact
visible-card counts: All→5, Switzerland→3, Czech Republic→1, United Kingdom→1, back to
All→5; confirm keyboard Tab reaches a chip and Enter activates it; zero console/page
errors); curl-verified exact rendered order/counts on the homepage collectors strip and
the Governance/Garden-Living-Collections/Contributors sections on `/network/`; `npm run
lint:markdown` shows the same pre-existing errors only, nothing new from
`rybka-vlastimil/index.md`.

## Cross-cutting notes for the final handoff

- **What can't be reproduced exactly, and why:**
  - The JS `rich` array-of-segments news format → adapted to plain Markdown with inline
    links (Phase 3) — same rendered content, different authoring mechanism, because Hugo
    has real routes the JS prototype didn't.
  - `<image-slot>` editor component → not applicable at all in a static Hugo build;
    already resolved to real `<img>` tags via existing glob-based asset resolution.
  - `heroVariant`/`statsLayout` A-B flags mentioned in `IMPLEMENTATION.md` → confirmed
    dead code in the actual prototype (no alternate markup exists) — implementing only
    the single real variant that exists, not a toggle system.
  - Per-collector live stats → plumbing only. Schema is now confirmed
    (`field_collector_fullname` on `Field_Data`, free-text name), but real numbers are
    blocked on a small upstream `directus-explorer` CLI addition (`--group-by
    collector`, collected-count only — species/profiled per collector is a larger,
    unscoped follow-on) plus a manual name→team-slug mapping file. See Phase 6.
  - Contact JS form → static mailto list instead, per user decision.
- **Theme bug found in Phase 3 (unfixed, out of scope):** plain Markdown root-relative
  links (`[text](/some/route/)`) render with a broken `href` (leading `/` silently
  stripped, e.g. `href="team/x"` instead of `/team/x/`) because Hinode's vendored
  `assets/link.html` partial (`_vendor/github.com/gethinode/hinode/v2/layouts/_partials/
  assets/link.html`) trims `site.BaseURL`'s path from the link destination without
  re-adding the leading slash. Confirmed via curl. Workaround used: write internal links
  in Markdown body copy as raw inline `<a href="...">` HTML instead (Goldmark passes raw
  HTML through untouched) — same technique already present elsewhere in this content.
  Anyone adding new internal Markdown links to body copy in later phases needs the same
  workaround, or a real fix to the vendored partial (upstream Hinode issue, not attempted
  here).
- **Copy confirmation needed:** any new page's body copy (Open Science, Publications,
  Approach timeline stages, About sections, restyled Contact intro) should be copied
  verbatim from the design file's text content, not paraphrased — flag anywhere the
  design's copy is ambiguous or incomplete for a straight lift.
- **Assumptions to confirm with the user before/at each phase:** ~~exact list of who gets
  `featured: true` on the team roster (Phase 2)~~ — resolved, decision 6. ~~final tag
  taxonomy per real news article (Phase 3)~~ — resolved, see Phase 3 above (including the
  `position_closed: true` inference on the 3 job-posting articles). ~~whether Network gets
  a dedicated `/network/` route or reuses `/gardens/` (Phase 4)~~ — resolved in Phase 0
  when the nav was built (`/network/`), confirmed and implemented in Phase 4. ~~Contact
  page copy (design's checklist + "Who can contribute" grid vs. current minimal copy)~~ —
  asked the user directly in Phase 4; approved using the design's copy verbatim. Still
  open: whether the news year-filter ships with or without JS (Phase 3 shipped without it
  — revisit only if the archive grows enough to need it).

## Final verification (after all phases) ✅ done (2026-08-05)

**Status: complete, no issues found.** Followed the "stop dev server → build → restart"
protocol from the operating notes throughout, to avoid the `_vendor`/`resources/_gen`
race documented in Phase 4:

- **`npm run build`** (stopped the dev server first): succeeded, 100 pages, no errors —
  only pre-existing deprecation warnings (`.Site.Data`/`.Site.Languages`/`.Site.AllPages`,
  unrelated to this redesign) and the expected "No content" warnings for the 6 pages whose
  copy is intentionally hardcoded in their Go templates rather than Markdown body (About,
  Work, Open Science, Publications, Network, Contact — documented in Phase 4). Restarted
  `npm run start` the same way afterward; confirmed back up via `curl -sI`.
- **`npm run lint`**: `lint:scripts` (eslint) and `lint:styles` (stylelint) both clean.
  `lint:markdown` shows the same 27 pre-existing errors as every prior phase's run (7
  formatting nits in the original news-article Markdown bodies, a handful in
  `implementation_plan.md` itself, one in `LICENSE.md`) — none in anything touched this
  session.
- **Manual visual pass**: screenshotted all 15 page types at 1440px and 375px against the
  restarted server (30 screenshots) — Home, Team list, Team person, News list, News
  article, Gardens list, Garden detail, Labs list, Lab detail, Network (now showing
  "Research Laboratories" throughout, matching the corrected nav), About, Work, Open
  Science, Publications, Contact. All clean: correct nav (no Contributors/Funding/
  Governance entries), no overflow, no visual regressions from the build/restart cycle or
  the nav-pruning changes. Re-ran the Phase 5 scripted breakpoint-matrix (112 checks) once
  more after the restart — still zero overflow/console errors.
- **Counters/timestamp**: confirmed directly in the built `public/index.html` — `data-
  count="7549"/"3545"/"1246"` match `data/garden_stats.yml`'s `totals` exactly (real data,
  not placeholders); "Last updated" renders from the real `generated_at` field.
- **Aliases**: confirmed both `public/author/<slug>/` (Team) and `public/post/<slug>/`
  (News) redirect pages exist in the build output and resolve correctly through the live
  server (`<meta http-equiv="refresh">` to the real `/team/<slug>/` / `/news/<slug>/`
  routes, HTTP 200) — unaffected by any template or nav changes this session.
