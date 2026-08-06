#!/usr/bin/env node

import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const sourceUrl = process.env.DBGI_TAXONOMIC_COVERAGE_URL
  || "https://raw.githubusercontent.com/digital-botanical-gardens-initiative/dbgi-comment-paper/refs/heads/main/reports/dbgi_coverage_summary.txt";
const outputPath = resolve(
  process.env.DBGI_TAXONOMIC_COVERAGE_OUTPUT || "data/taxonomic_coverage.yml",
);
const requireCoverage = process.env.DBGI_REQUIRE_TAXONOMIC_COVERAGE === "true";

const colors = new Map([
  ["Orders", "#1e3d03"],
  ["Families", "#2f5510"],
  ["Genera", "#487026"],
  ["Species", "#5f8b39"],
]);

function skipOrFail(message) {
  if (requireCoverage || !existsSync(outputPath)) {
    throw new Error(message);
  }
  console.warn(`[taxonomic-coverage] ${message}; keeping existing ${outputPath}`);
  process.exit(0);
}

function yamlString(value) {
  return JSON.stringify(value ?? "");
}

function parseDate(text) {
  const match = text.match(/as of\s+(.+)$/im);
  if (!match) return new Date().toISOString().slice(0, 10);

  const dateText = match[1].trim();
  const explicit = dateText.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (explicit) {
    const months = new Map([
      ["january", "01"],
      ["february", "02"],
      ["march", "03"],
      ["april", "04"],
      ["may", "05"],
      ["june", "06"],
      ["july", "07"],
      ["august", "08"],
      ["september", "09"],
      ["october", "10"],
      ["november", "11"],
      ["december", "12"],
    ]);
    const month = months.get(explicit[2].toLowerCase());
    if (month) return `${explicit[3]}-${month}-${explicit[1].padStart(2, "0")}`;
  }

  const parsed = new Date(dateText);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10);

  return parsed.toISOString().slice(0, 10);
}

function parseRows(text) {
  const rowPattern = /^-\s+Plant\s+(orders|families|genera|species):\s+([\d,]+)\s*\/\s*([\d,]+)\s+\(([\d.]+)%\)/gim;
  const rows = [];
  let match = rowPattern.exec(text);

  while (match) {
    const label = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
    rows.push({
      label,
      covered: Number(match[2].replaceAll(",", "")),
      total: Number(match[3].replaceAll(",", "")),
      color: colors.get(label) || "#26490d",
    });
    match = rowPattern.exec(text);
  }

  return rows;
}

function renderYaml(payload) {
  const lines = [
    "# Generated from the DBGI comment paper coverage summary.",
    `generated_at: ${yamlString(payload.generatedAt)}`,
    `source: ${yamlString(payload.source)}`,
    "rows:",
  ];

  for (const row of payload.rows) {
    lines.push(`  - label: ${row.label}`);
    lines.push(`    covered: ${row.covered}`);
    lines.push(`    total: ${row.total}`);
    lines.push(`    color: ${yamlString(row.color)}`);
  }

  return `${lines.join("\n")}\n`;
}

try {
  const response = await fetch(sourceUrl, {
    headers: {
      "Accept": "text/plain",
      "User-Agent": "dbgi-website/2.0 (+https://www.dbgi.org)",
    },
  });

  if (!response.ok) {
    skipOrFail(`${sourceUrl} returned HTTP ${response.status}`);
  }

  const text = await response.text();
  const rows = parseRows(text);
  if (rows.length !== 4 || rows.some((row) => !row.covered || !row.total)) {
    skipOrFail(`Could not parse four non-zero coverage rows from ${sourceUrl}`);
  }

  writeFileSync(
    outputPath,
    renderYaml({
      generatedAt: parseDate(text),
      source: sourceUrl,
      rows,
    }),
    "utf8",
  );
  console.log(`[taxonomic-coverage] Wrote ${outputPath}`);
} catch (error) {
  skipOrFail(error.message);
}
