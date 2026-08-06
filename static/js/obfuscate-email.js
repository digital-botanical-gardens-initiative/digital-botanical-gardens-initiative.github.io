(function () {
  document.querySelectorAll('[data-obfuscate-email]').forEach(function (el) {
    var user = el.getAttribute('data-user');
    var domain = el.getAttribute('data-domain');
    if (!user || !domain) return;
    var address = user + '@' + domain;
    el.setAttribute('href', 'mailto:' + address);
    if (!el.hasAttribute('data-label')) {
      el.textContent = address;
    }
    el.removeAttribute('data-obfuscate-email');
  });
})();
