(function () {
  var counters = Array.prototype.slice.call(document.querySelectorAll(".dbgi-counter"));
  if (!counters.length) return;

  var formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function setValue(counter, value) {
    counter.textContent = formatter.format(Math.round(value));
  }

  function animate(counter) {
    if (counter.dataset.done === "true") return;
    counter.dataset.done = "true";

    var target = Number(counter.dataset.count || 0);
    if (!Number.isFinite(target) || target <= 0 || reduceMotion) {
      setValue(counter, target);
      return;
    }

    var duration = 2200;
    var start = performance.now();
    counter.classList.add("is-ticking");

    function frame(now) {
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      setValue(counter, target * eased);

      if (progress < 1) {
        requestAnimationFrame(frame);
        return;
      }

      setValue(counter, target);
      counter.classList.remove("is-ticking");
    }

    requestAnimationFrame(frame);
  }

  if (!("IntersectionObserver" in window)) {
    counters.forEach(animate);
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      animate(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.35 });

  counters.forEach(function (counter) {
    observer.observe(counter);
  });
})();
