#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Local checkouts of directus-explorer nested inside this repo (e.g. ./directus-explorer)
// need DIRECTUS_EXPLORER_DIR set explicitly, since it isn't a sibling of this repo the way
// the default assumes. CI already sets DIRECTUS_EXPLORER_DIR=directus-explorer.
const directusExplorerDir = resolve(
  process.env.DIRECTUS_EXPLORER_DIR || "../directus-explorer",
);
const outputPath = resolve(process.env.DBGI_COLLECTOR_STATS_OUTPUT || "data/collector_stats.yml");
const requireStats = process.env.DBGI_REQUIRE_DIRECTUS_STATS === "true";

function skipOrFail(message) {
  if (requireStats) {
    throw new Error(message);
  }
  console.warn(`[collector-stats] ${message}; keeping existing ${outputPath}`);
  process.exit(0);
}

function runExplorer(args) {
  const result = spawnSync("uv", ["run", "directus-explorer", ...args], {
    cwd: directusExplorerDir,
    encoding: "utf8",
    env: process.env,
  });

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "unknown error").trim();
    throw new Error(`directus-explorer ${args.join(" ")} failed: ${detail}`);
  }

  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Could not parse directus-explorer JSON output: ${error.message}`);
  }
}

function yamlString(value) {
  return JSON.stringify(value);
}

function renderYaml(stats) {
  const lines = [
    `generated_at: ${yamlString(stats.generatedAt)}`,
    "source: Directus Field_Data via directus-explorer",
    "collectors:",
  ];

  for (const collector of stats.collectors) {
    lines.push(`  ${yamlString(collector.fullname)}:`);
    lines.push(`    collected_samples: ${collector.collectedCount}`);
  }

  return `${lines.join("\n")}\n`;
}

if (!existsSync(directusExplorerDir)) {
  skipOrFail(`Directus explorer directory not found at ${directusExplorerDir}`);
}

try {
  const payload = runExplorer([
    "samples",
    "summary",
    "--group-by",
    "collector",
    "--format",
    "json",
  ]);

  const rows = payload.projects || [];
  const collectors = rows
    .map((row) => ({
      fullname: row.collector_fullname,
      collectedCount: Number(row.collected_count || 0),
    }))
    .sort((a, b) => a.fullname.localeCompare(b.fullname));

  const stats = {
    generatedAt: new Date().toISOString(),
    collectors,
  };

  writeFileSync(outputPath, renderYaml(stats), "utf8");
  console.log(`[collector-stats] Wrote ${outputPath} (${collectors.length} collectors)`);
} catch (error) {
  skipOrFail(error.message);
}
