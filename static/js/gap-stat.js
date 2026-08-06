(function () {
  var els = Array.prototype.slice.call(document.querySelectorAll("[data-gap-stat]"));
  if (!els.length) return;

  var ENDPOINT = "https://qlever.cs.uni-freiburg.de/api/wikidata";
  var SPARQL = [
    "PREFIX wd: <http://www.wikidata.org/entity/>",
    "PREFIX wdt: <http://www.wikidata.org/prop/direct/>",
    "SELECT (COUNT(DISTINCT ?species) AS ?speciesWithCompound) WHERE {",
    "  ?compound wdt:P703 ?species .",
    "  ?species wdt:P171* wd:Q25314 .",
    "}",
  ].join("\n");
  var TOTAL = 400000;
  var CACHE_KEY = "dbgi.gapStat.v1";
  var MAX_AGE = 7 * 24 * 60 * 60 * 1000;

  function render(count, updated) {
    var pct = (Math.round((count / TOTAL) * 1000) / 10).toFixed(1) + "%";
    var restPct = (Math.round((100 - count / TOTAL * 100) * 10) / 10).toFixed(1) + "%";
    var barWidth = Math.max(0.6, (count / TOTAL) * 100).toFixed(2) + "%";
    var updatedYear = String(updated).trim().split(/\s+/).pop();

    els.forEach(function (el) {
      el.querySelectorAll("[data-gap-pct]").forEach(function (n) { n.textContent = pct; });
      el.querySelectorAll("[data-gap-rest-pct]").forEach(function (n) { n.textContent = restPct; });
      el.querySelectorAll("[data-gap-updated]").forEach(function (n) { n.textContent = updated; });
      el.querySelectorAll("[data-gap-updated-year]").forEach(function (n) { n.textContent = updatedYear; });
      el.querySelectorAll("[data-gap-donut]").forEach(function (n) {
        n.style.background = "conic-gradient(#26490d 0 " + barWidth + ", #e4eadd " + barWidth + " 100%)";
      });
    });
  }

  var cached = null;
  try {
    cached = JSON.parse(window.localStorage.getItem(CACHE_KEY) || "null");
  } catch (e) {}

  if (cached && cached.count > 0) {
    render(cached.count, cached.updated);
    if (Date.now() - (cached.fetchedAt || 0) < MAX_AGE) return;
  }

  var url = ENDPOINT + "?query=" + encodeURIComponent(SPARQL);
  fetch(url, { headers: { Accept: "application/sparql-results+json" } })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (j) {
      var raw = j && j.results && j.results.bindings && j.results.bindings[0];
      var n = raw ? parseInt(String(Object.values(raw)[0].value).replace(/[^0-9]/g, ""), 10) : 0;
      if (!n || !isFinite(n)) return; // fail-safe: keep last good value on screen
      var updated = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      render(n, updated);
      try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify({ count: n, updated: updated, fetchedAt: Date.now() }));
      } catch (e) {}
    })
    .catch(function () {}); // offline / CORS -> cached (or seeded) value stands
})();
