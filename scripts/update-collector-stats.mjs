#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

// Local checkouts of directus-explorer nested inside this repo (e.g. ./directus-explorer)
// need DIRECTUS_EXPLORER_DIR set explicitly, since it isn't a sibling of this repo the way
// the default assumes. CI already sets DIRECTUS_EXPLORER_DIR=directus-explorer.
const directusExplorerDir = resolve(
  process.env.DIRECTUS_EXPLORER_DIR || "../directus-explorer",
);
const outputPath = resolve(process.env.DBGI_COLLECTOR_STATS_OUTPUT || "data/collector_stats.yml");
const projectGroup = process.env.DBGI_COLLECTOR_PROJECT_GROUP || "dbgi";
const requireStats = process.env.DBGI_REQUIRE_DIRECTUS_STATS === "true";
const teamDir = resolve(process.env.DBGI_TEAM_CONTENT_DIR || "content/team");

const collectorQuery = String.raw`
import json
import sys
from collections import Counter

from directus_explorer.config import load_settings
from directus_explorer.directus import DirectusClient
from directus_explorer.samples import PROJECT_GROUPS

project_group = sys.argv[1]
if project_group not in PROJECT_GROUPS:
    raise SystemExit(f"Unknown project group: {project_group}")

client = DirectusClient(load_settings())
client._authenticate()
project_keys = set(PROJECT_GROUPS[project_group])
rows = client._get_items(
    collection="Field_Data",
    fields="id,qfield_project,collector_fullname,collector_ref.id,collector_ref.full_name",
)

counts = Counter()
missing = 0
linked = 0
unlinked_named = 0

for row in rows:
    if row.get("qfield_project") not in project_keys:
        continue

    ref = row.get("collector_ref")
    person_id = ""
    name = ""

    if isinstance(ref, dict):
        person_id = str(ref.get("id") or "").strip()
        name = str(ref.get("full_name") or "").strip()

    if name:
        linked += 1
        counts[("people", person_id, name)] += 1
        continue

    raw_name = str(row.get("collector_fullname") or "").strip()
    if raw_name:
        unlinked_named += 1
        counts[("field_data", "", raw_name)] += 1
    else:
        missing += 1

collectors = [
    {
        "source": source,
        "collector_ref_id": person_id,
        "full_name": name,
        "collected_samples": count,
    }
    for (source, person_id, name), count in counts.items()
]
collectors.sort(key=lambda row: (-row["collected_samples"], row["full_name"]))

print(json.dumps({
    "total_samples": linked + unlinked_named + missing,
    "named_samples": linked + unlinked_named,
    "linked_samples": linked,
    "unlinked_named_samples": unlinked_named,
    "missing_collector_samples": missing,
    "distinct_named_collectors": len(collectors),
    "collectors": collectors,
}, ensure_ascii=False))
`;

function skipOrFail(message) {
  if (requireStats) {
    throw new Error(message);
  }
  console.warn(`[collector-stats] ${message}; keeping existing ${outputPath}`);
  process.exit(0);
}

function runPythonCollectorQuery() {
  const result = spawnSync("uv", ["run", "python", "-c", collectorQuery, projectGroup], {
    cwd: directusExplorerDir,
    encoding: "utf8",
    env: process.env,
  });

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "unknown error").trim();
    throw new Error(`directus-explorer collector query failed: ${detail}`);
  }

  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Could not parse directus-explorer collector JSON: ${error.message}`);
  }
}

function yamlString(value) {
  return JSON.stringify(value);
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokens(value) {
  return normalizeName(value).split(" ").filter(Boolean);
}

function levenshtein(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let i = 0; i < left.length; i += 1) {
    let last = i;
    previous[0] = i + 1;

    for (let j = 0; j < right.length; j += 1) {
      const old = previous[j + 1];
      previous[j + 1] = Math.min(
        previous[j + 1] + 1,
        previous[j] + 1,
        last + (left[i] === right[j] ? 0 : 1),
      );
      last = old;
    }
  }

  return previous[right.length];
}

function readTeamPages() {
  if (!existsSync(teamDir)) {
    return [];
  }

  return readdirSync(teamDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const path = join(teamDir, entry.name, "index.md");
      if (!existsSync(path)) {
        return null;
      }

      const markdown = readFileSync(path, "utf8");
      const titleMatch = markdown.match(/^title:\s*(?:"([^"]+)"|'([^']+)'|(.+))$/m);
      const title = (titleMatch?.[1] || titleMatch?.[2] || titleMatch?.[3] || "").trim();

      if (!title) {
        return null;
      }

      return {
        slug: entry.name,
        title,
        normalizedTitle: normalizeName(title),
        titleTokens: new Set(tokens(title)),
      };
    })
    .filter(Boolean);
}

function matchTeamPage(fullName, teamPages) {
  const normalized = normalizeName(fullName);
  const nameTokens = tokens(fullName);

  if (!normalized || nameTokens.length === 0) {
    return null;
  }

  let best = null;

  for (const page of teamPages) {
    const distance = levenshtein(normalized, page.normalizedTitle);
    const distanceScore = 1 - distance / Math.max(normalized.length, page.normalizedTitle.length);
    const overlap = nameTokens.filter((token) => page.titleTokens.has(token)).length;
    const overlapScore = overlap === nameTokens.length ? 0.92 : overlap / nameTokens.length;
    const exactScore = normalized === page.normalizedTitle ? 1 : 0;
    const score = Math.max(exactScore, distanceScore, overlapScore);

    if (!best || score > best.score) {
      best = { ...page, score };
    }
  }

  return best && best.score >= 0.82 ? best : null;
}

function roundShare(value) {
  return Number(value.toFixed(6));
}

function renderYaml(stats) {
  const lines = [
    `generated_at: ${yamlString(stats.generatedAt)}`,
    "source: Directus Field_Data collector_ref via directus-explorer",
    `project_group: ${yamlString(stats.projectGroup)}`,
    `total_samples: ${stats.totalSamples}`,
    `named_samples: ${stats.namedSamples}`,
    `linked_people_samples: ${stats.linkedPeopleSamples}`,
    `unlinked_named_samples: ${stats.unlinkedNamedSamples}`,
    `missing_collector_samples: ${stats.missingCollectorSamples}`,
    `distinct_named_collectors: ${stats.distinctNamedCollectors}`,
    "collectors:",
  ];

  for (const collector of stats.collectors) {
    lines.push("  -");
    lines.push(`    full_name: ${yamlString(collector.fullName)}`);
    lines.push(`    collected_samples: ${collector.collectedSamples}`);
    lines.push(`    share: ${collector.share}`);
    lines.push(`    source: ${yamlString(collector.source)}`);
    lines.push(`    collector_ref_id: ${yamlString(collector.collectorRefId)}`);
    lines.push(`    team_slug: ${yamlString(collector.teamSlug)}`);
    lines.push(`    team_title: ${yamlString(collector.teamTitle)}`);
    lines.push(`    team_match_score: ${collector.teamMatchScore}`);
  }

  lines.push("unmatched_collectors:");
  for (const collector of stats.collectors.filter((collector) => !collector.teamSlug)) {
    lines.push("  -");
    lines.push(`    full_name: ${yamlString(collector.fullName)}`);
    lines.push(`    collected_samples: ${collector.collectedSamples}`);
    lines.push(`    source: ${yamlString(collector.source)}`);
    lines.push(`    collector_ref_id: ${yamlString(collector.collectorRefId)}`);
  }

  return `${lines.join("\n")}\n`;
}

if (!existsSync(directusExplorerDir)) {
  skipOrFail(`Directus explorer directory not found at ${directusExplorerDir}`);
}

try {
  const payload = runPythonCollectorQuery();
  const teamPages = readTeamPages();
  const totalSamples = Number(payload.total_samples || 0);
  const collectors = (payload.collectors || []).map((collector) => {
    const match = matchTeamPage(collector.full_name, teamPages);
    const collectedSamples = Number(collector.collected_samples || 0);

    return {
      fullName: collector.full_name,
      collectedSamples,
      share: totalSamples === 0 ? 0 : roundShare(collectedSamples / totalSamples),
      source: collector.source,
      collectorRefId: collector.collector_ref_id || "",
      teamSlug: match?.slug || "",
      teamTitle: match?.title || "",
      teamMatchScore: match ? roundShare(match.score) : 0,
    };
  });

  const stats = {
    generatedAt: new Date().toISOString(),
    projectGroup,
    totalSamples,
    namedSamples: Number(payload.named_samples || 0),
    linkedPeopleSamples: Number(payload.linked_samples || 0),
    unlinkedNamedSamples: Number(payload.unlinked_named_samples || 0),
    missingCollectorSamples: Number(payload.missing_collector_samples || 0),
    distinctNamedCollectors: Number(payload.distinct_named_collectors || collectors.length),
    collectors,
  };

  writeFileSync(outputPath, renderYaml(stats), "utf8");
  console.log(
    `[collector-stats] Wrote ${outputPath} (${stats.totalSamples} ${projectGroup} samples, ${stats.linkedPeopleSamples} linked People samples, ${stats.distinctNamedCollectors} named collectors)`,
  );
} catch (error) {
  skipOrFail(error.message);
}
