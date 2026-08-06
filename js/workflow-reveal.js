(function () {
  var wrap = document.querySelector(".dbgi-workflow");
  if (!wrap) return;

  var steps = Array.prototype.slice.call(wrap.querySelectorAll(".dbgi-workflow-step"));
  if (!steps.length) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function reveal() {
    if (wrap.dataset.done === "true") return;
    wrap.dataset.done = "true";

    steps.forEach(function (step) { step.classList.add("is-revealed"); });
  }

  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveal();
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      reveal();
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.25 });

  observer.observe(wrap);
})();
