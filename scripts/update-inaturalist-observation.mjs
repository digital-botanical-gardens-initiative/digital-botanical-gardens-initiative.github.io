#!/usr/bin/env node

import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const outputPath = resolve(
  process.env.DBGI_INATURALIST_OBSERVATION_OUTPUT || "data/inaturalist_observation.yml",
);
const requireObservation = process.env.DBGI_REQUIRE_INATURALIST_OBSERVATION === "true";
const userId = process.env.DBGI_INATURALIST_USER || "dbgi";
const apiBase = "https://api.inaturalist.org/v1/observations";

function skipOrFail(message) {
  if (requireObservation || !existsSync(outputPath)) {
    throw new Error(message);
  }
  console.warn(`[inaturalist] ${message}; keeping existing ${outputPath}`);
  process.exit(0);
}

function yamlString(value) {
  return JSON.stringify(value ?? "");
}

function yamlList(values, indent = "  ") {
  if (!values || values.length === 0) {
    return [`${indent}[]`];
  }
  return values.map((value) => `${indent}- ${yamlString(value)}`);
}

function photoVariant(url, size) {
  if (!url) return "";
  return url.replace(/\/square\.(jpg|jpeg|png)$/i, `/${size}.$1`);
}

function pickDailyPage(total) {
  const day = Math.floor(Date.now() / 86400000);
  return (day % total) + 1;
}

function extractTag(tags, prefix) {
  const tag = (tags || []).find((value) => value.startsWith(prefix));
  return tag ? tag.slice(prefix.length).trim() : "";
}

function renderYaml(payload) {
  const lines = [
    `generated_at: ${yamlString(payload.generatedAt)}`,
    `source: ${yamlString(payload.source)}`,
    `api_url: ${yamlString(payload.apiUrl)}`,
    `user: ${yamlString(payload.user)}`,
    `total_observations: ${payload.totalObservations}`,
    `daily_index: ${payload.dailyIndex}`,
    "observation:",
    `  id: ${payload.observation.id}`,
    `  uri: ${yamlString(payload.observation.uri)}`,
    `  taxon_name: ${yamlString(payload.observation.taxonName)}`,
    `  taxon_url: ${yamlString(payload.observation.taxonUrl)}`,
    `  common_name: ${yamlString(payload.observation.commonName)}`,
    `  rank: ${yamlString(payload.observation.rank)}`,
    `  observed_on: ${yamlString(payload.observation.observedOn)}`,
    `  observed_on_string: ${yamlString(payload.observation.observedOnString)}`,
    `  place_guess: ${yamlString(payload.observation.placeGuess)}`,
    `  description: ${yamlString(payload.observation.description)}`,
    `  quality_grade: ${yamlString(payload.observation.qualityGrade)}`,
    `  license_code: ${yamlString(payload.observation.licenseCode)}`,
    `  captive: ${payload.observation.captive ? "true" : "false"}`,
    `  collector: ${yamlString(payload.observation.collector)}`,
    `  collector_inat: ${yamlString(payload.observation.collectorInat)}`,
    `  collector_orcid: ${yamlString(payload.observation.collectorOrcid)}`,
    `  external_id: ${yamlString(payload.observation.externalId)}`,
    `  original_taxon: ${yamlString(payload.observation.originalTaxon)}`,
    "  photo:",
    `    square_url: ${yamlString(payload.observation.photo.squareUrl)}`,
    `    medium_url: ${yamlString(payload.observation.photo.mediumUrl)}`,
    `    large_url: ${yamlString(payload.observation.photo.largeUrl)}`,
    `    attribution: ${yamlString(payload.observation.photo.attribution)}`,
    `    license_code: ${yamlString(payload.observation.photo.licenseCode)}`,
    `    width: ${payload.observation.photo.width}`,
    `    height: ${payload.observation.photo.height}`,
    "  tags:",
    ...yamlList(payload.observation.tags, "    "),
  ];

  return `${lines.join("\n")}\n`;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "dbgi-website/2.0 (+https://www.dbgi.org)",
    },
  });

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return response.json();
}

try {
  const countUrl = new URL(apiBase);
  countUrl.searchParams.set("user_id", userId);
  countUrl.searchParams.set("per_page", "1");
  countUrl.searchParams.set("order", "asc");
  countUrl.searchParams.set("order_by", "created_at");

  const countPayload = await fetchJson(countUrl);
  const total = Number(countPayload.total_results || 0);
  if (!total) {
    skipOrFail(`No iNaturalist observations found for user ${userId}`);
  }

  const dailyIndex = pickDailyPage(total);
  const observationUrl = new URL(apiBase);
  observationUrl.searchParams.set("user_id", userId);
  observationUrl.searchParams.set("per_page", "1");
  observationUrl.searchParams.set("page", String(dailyIndex));
  observationUrl.searchParams.set("order", "asc");
  observationUrl.searchParams.set("order_by", "created_at");

  const observationPayload = await fetchJson(observationUrl);
  const observation = observationPayload.results?.[0];
  if (!observation) {
    skipOrFail(`No observation found at daily index ${dailyIndex}`);
  }

  const photo = observation.photos?.[0] || {};
  const dimensions = photo.original_dimensions || {};
  const taxon = observation.taxon || {};
  const tags = observation.tags || [];
  const payload = {
    generatedAt: new Date().toISOString(),
    source: "iNaturalist observations by DBGI",
    apiUrl: observationUrl.toString(),
    user: userId,
    totalObservations: total,
    dailyIndex,
    observation: {
      id: observation.id,
      uri: observation.uri,
      taxonName: taxon.name || observation.species_guess || "",
      taxonUrl: taxon.id ? `https://www.inaturalist.org/taxa/${taxon.id}` : "",
      commonName: taxon.preferred_common_name || "",
      rank: taxon.rank || "",
      observedOn: observation.observed_on || "",
      observedOnString: observation.observed_on_string || "",
      placeGuess: observation.place_guess || "",
      description: observation.description || "",
      qualityGrade: observation.quality_grade || "",
      licenseCode: observation.license_code || "",
      captive: Boolean(observation.captive),
      collector: extractTag(tags, "emi_collector:"),
      collectorInat: extractTag(tags, "emi_collector_inat:"),
      collectorOrcid: extractTag(tags, "emi_collector_orcid:"),
      externalId: extractTag(tags, "emi_external_id:"),
      originalTaxon: extractTag(tags, "emi_original_taxon:"),
      tags,
      photo: {
        squareUrl: photo.url || "",
        mediumUrl: photoVariant(photo.url, "medium"),
        largeUrl: photoVariant(photo.url, "large"),
        attribution: photo.attribution || "",
        licenseCode: photo.license_code || "",
        width: Number(dimensions.width || 0),
        height: Number(dimensions.height || 0),
      },
    },
  };

  writeFileSync(outputPath, renderYaml(payload), "utf8");
  console.log(`[inaturalist] Wrote ${outputPath}`);
} catch (error) {
  skipOrFail(error.message);
}
