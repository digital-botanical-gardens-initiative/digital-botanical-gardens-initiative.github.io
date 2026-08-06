(function () {
  var chips = Array.prototype.slice.call(document.querySelectorAll(".dbgi-garden-chip"));
  var cards = Array.prototype.slice.call(document.querySelectorAll(".dbgi-garden-card"));
  if (!chips.length || !cards.length) return;

  function applyFilter(country) {
    cards.forEach(function (card) {
      card.hidden = !(country === "All" || card.dataset.country === country);
    });
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (c) { c.classList.remove("is-active"); });
      chip.classList.add("is-active");
      applyFilter(chip.dataset.country || "All");
    });
  });
})();
