(function () {
  var bars = Array.prototype.slice.call(document.querySelectorAll(".dbgi-coverage-bar-fill"));
  if (!bars.length) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function grow(bar) {
    if (bar.dataset.done === "true") return;
    bar.dataset.done = "true";

    var width = bar.dataset.width || "0%";
    if (reduceMotion) {
      bar.style.width = width;
      return;
    }

    requestAnimationFrame(function () {
      bar.style.width = width;
    });
  }

  if (!("IntersectionObserver" in window)) {
    bars.forEach(grow);
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      grow(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.35 });

  bars.forEach(function (bar) {
    observer.observe(bar);
  });
})();
