// Fills the legal pages (privacy.html, termini.html, elimina-account.html)
// from web/features.json "legal", the same block the app reads. The data
// controller's details are fields to fill in there, never text in the pages:
// until they are filled, each page says it is a draft.
(function () {
  var features = (typeof self !== 'undefined' && self.NURVAN_FEATURES) || {};
  var legal = features.legal || {};
  var contact = String(legal.privacyEmail || features.contactEmail || '').trim();
  var values = {
    controllerName: String(legal.controllerName || '').trim(),
    controllerAddress: String(legal.controllerAddress || '').trim(),
    controllerVat: String(legal.controllerVat || '').trim(),
    hostingRegion: String(legal.hostingRegion || '').trim(),
    privacyEmail: contact,
    minAge: String(legal.minAge || 16),
    lastUpdated: String(legal.lastUpdated || legal.version || '').trim(),
    version: String(legal.version || '').trim()
  };
  var placeholders = {
    controllerName: '[nome o ragione sociale del titolare]',
    controllerAddress: '[indirizzo del titolare]',
    controllerVat: '[partita IVA / codice fiscale]',
    hostingRegion: '[regione dei server]',
    privacyEmail: '[email di contatto privacy]',
    lastUpdated: '[data]',
    version: '[versione]'
  };
  var missing = [];
  document.querySelectorAll('[data-legal]').forEach(function (el) {
    var key = el.getAttribute('data-legal');
    var value = values[key];
    if (value) {
      if (key === 'privacyEmail' && el.tagName === 'A') {
        el.textContent = value;
        el.setAttribute('href', 'mailto:' + value);
      } else {
        el.textContent = value;
      }
    } else {
      el.textContent = placeholders[key] || '[da compilare]';
      el.classList.add('missing');
      if (missing.indexOf(key) < 0) missing.push(key);
    }
  });
  var banner = document.getElementById('legal-draft');
  var essential = ['controllerName', 'controllerAddress', 'privacyEmail'];
  var incomplete = essential.some(function (k) { return !values[k]; });
  if (banner) banner.hidden = !incomplete;
})();
