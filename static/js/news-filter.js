(function () {
  function initNewsFilter(bar) {
    var list = document.querySelector('[data-role="list"]');
    var fromSelect = bar.querySelector('[data-role="from"]');
    var toSelect = bar.querySelector('[data-role="to"]');
    var countEl = bar.querySelector('[data-role="count"]');
    if (!list || !fromSelect || !toSelect) return;

    var rows = Array.prototype.slice.call(list.querySelectorAll(".dbgi-news-row"));
    var emptyState = list.querySelector('[data-role="empty"]');
    var resetBtn = emptyState ? emptyState.querySelector('[data-role="reset"]') : null;

    function apply() {
      var lo = Math.min(Number(fromSelect.value), Number(toSelect.value));
      var hi = Math.max(Number(fromSelect.value), Number(toSelect.value));
      var visible = 0;

      rows.forEach(function (row) {
        var year = Number(row.getAttribute("data-year"));
        var show = year >= lo && year <= hi;
        row.hidden = !show;
        if (show) visible += 1;
      });

      if (countEl) {
        countEl.textContent = visible + (visible === 1 ? " story" : " stories");
      }
      if (emptyState) {
        emptyState.hidden = visible !== 0;
      }
    }

    fromSelect.addEventListener("change", apply);
    toSelect.addEventListener("change", apply);

    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        fromSelect.selectedIndex = 0;
        toSelect.selectedIndex = toSelect.options.length - 1;
        apply();
      });
    }
  }

  document.querySelectorAll(".dbgi-news-filter-bar").forEach(initNewsFilter);
})();
