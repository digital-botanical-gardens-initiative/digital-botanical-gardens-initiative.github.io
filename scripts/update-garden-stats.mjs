#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const directusExplorerDir = resolve(
  process.env.DIRECTUS_EXPLORER_DIR || "../directus-explorer",
);
const outputPath = resolve(process.env.DBGI_GARDEN_STATS_OUTPUT || "data/garden_stats.yml");
const requireStats = process.env.DBGI_REQUIRE_DIRECTUS_STATS === "true";

const gardens = [
  {
    key: "fribourg",
    projects: ["jbuf"],
  },
  {
    key: "neuchatel",
    projects: ["jbn", "jbn-new"],
  },
  {
    key: "champex",
    projects: ["jbc"],
  },
  {
    key: "prague",
    projects: ["jbp", "jbp-new"],
  },
  {
    key: "kew",
    projects: ["kew-botanical-gardens"],
  },
];

function skipOrFail(message) {
  if (requireStats) {
    throw new Error(message);
  }
  console.warn(`[garden-stats] ${message}; keeping existing ${outputPath}`);
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

function runExplorerPython(script) {
  const result = spawnSync("uv", ["run", "python", "-c", script], {
    cwd: directusExplorerDir,
    encoding: "utf8",
    env: process.env,
  });

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "unknown error").trim();
    throw new Error(`directus-explorer Python aggregate failed: ${detail}`);
  }

  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`Could not parse directus-explorer Python JSON output: ${error.message}`);
  }
}

function indexProjects(payload, countKey) {
  const rows = payload.projects || [];
  return new Map(rows.map((row) => [row.qfield_project, Number(row[countKey] || 0)]));
}

function sumProjects(index, projects) {
  return projects.reduce((total, project) => total + (index.get(project) || 0), 0);
}

function yamlString(value) {
  return JSON.stringify(value);
}

function extractTotals(text) {
  const block = text.match(/totals:\n([\s\S]*?)\ngardens:/);
  if (!block) return null;

  const samples = block[1].match(/samples:\s*(\d+)/);
  const species = block[1].match(/species:\s*(\d+)/);
  const profiledSamples = block[1].match(/profiled_samples:\s*(\d+)/);

  return {
    samples: samples ? Number(samples[1]) : null,
    species: species ? Number(species[1]) : null,
    profiledSamples: profiledSamples ? Number(profiledSamples[1]) : null,
  };
}

function renderYaml(stats) {
  const lines = [
    `generated_at: ${yamlString(stats.generatedAt)}`,
    "source: Directus Field_Data via directus-explorer",
    "totals:",
    `  samples: ${stats.totals.samples}`,
    `  species: ${stats.totals.species}`,
    `  profiled_samples: ${stats.totals.profiledSamples}`,
    "gardens:",
  ];

  for (const garden of gardens) {
    const gardenStats = stats.gardens[garden.key];
    lines.push(`  ${garden.key}:`);
    lines.push(`    samples: ${gardenStats.samples}`);
    lines.push(`    species: ${gardenStats.species}`);
    lines.push(`    profiled_samples: ${gardenStats.profiledSamples}`);
    lines.push("    projects:");
    for (const project of garden.projects) {
      lines.push(`      - ${project}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

if (!existsSync(directusExplorerDir)) {
  skipOrFail(`Directus explorer directory not found at ${directusExplorerDir}`);
}

try {
  const samplePayload = runExplorer([
    "samples",
    "summary",
    "--group-by",
    "project",
    "--format",
    "json",
  ]);
  const speciesPayload = runExplorer([
    "samples",
    "summary",
    "--group-by",
    "project",
    "--count",
    "species",
    "--format",
    "json",
  ]);

  const samplesByProject = indexProjects(samplePayload, "collected_count");
  const profiledByProject = indexProjects(samplePayload, "profiled_count");
  const speciesByProject = indexProjects(speciesPayload, "collected_species_count");
  const allProjects = gardens.flatMap((garden) => garden.projects);
  const distinctSpeciesPayload = runExplorerPython(`
import json
from directus_explorer.config import load_settings
from directus_explorer.directus import DirectusClient

projects = ${JSON.stringify(allProjects)}
client = DirectusClient(load_settings())
summary = client._summarize_species_by_project_groups(
    project_groups={"sampled_gardens": set(projects)}
)[0]
print(json.dumps({"species": summary.collected_count}))
`);
  const stats = {
    generatedAt: new Date().toISOString(),
    totals: {
      samples: sumProjects(samplesByProject, allProjects),
      species: Number(distinctSpeciesPayload.species || 0),
      profiledSamples: sumProjects(profiledByProject, allProjects),
    },
    gardens: Object.fromEntries(
      gardens.map((garden) => [
        garden.key,
        {
          samples: sumProjects(samplesByProject, garden.projects),
          species: sumProjects(speciesByProject, garden.projects),
          profiledSamples: sumProjects(profiledByProject, garden.projects),
        },
      ]),
    ),
  };

  if (existsSync(outputPath)) {
    const previous = extractTotals(readFileSync(outputPath, "utf8"));
    if (previous?.samples != null && stats.totals.samples < previous.samples) {
      skipOrFail(`totals.samples dropped from ${previous.samples} to ${stats.totals.samples}`);
    }
    if (previous?.species != null && stats.totals.species < previous.species) {
      skipOrFail(`totals.species dropped from ${previous.species} to ${stats.totals.species}`);
    }
    if (previous?.profiledSamples != null && stats.totals.profiledSamples < previous.profiledSamples) {
      skipOrFail(
        `totals.profiled_samples dropped from ${previous.profiledSamples} to ${stats.totals.profiledSamples}`,
      );
    }
  }

  writeFileSync(outputPath, renderYaml(stats), "utf8");
  console.log(`[garden-stats] Wrote ${outputPath}`);
} catch (error) {
  skipOrFail(error.message);
}
