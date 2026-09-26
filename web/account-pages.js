// The pages the account emails link to: /verifica-email?t=... confirms the
// address, /reimposta-password?t=... sets a new password. The token leaves
// the address bar as soon as it is read, so it is not left in the history.
(function () {
  var params = new URLSearchParams(location.search);
  var token = params.get('t') || '';
  if (token) { try { history.replaceState(null, '', location.pathname); } catch (_) {} }
  var $ = function (id) { return document.getElementById(id); };
  var say = function (text) { var el = $('acct-status'); if (el) el.textContent = text; };
  var done = function () {
    if ($('acct-next')) $('acct-next').hidden = false;
    if ($('acct-open')) $('acct-open').hidden = false;
  };
  function post(path, body) {
    return fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'omit' })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) throw new Error(j.error || ('Errore ' + r.status));
          return j;
        });
      });
  }

  if (/\/verifica-email/.test(location.pathname)) {
    if (!token) { say('Questo link non è completo. Nell\'app puoi chiedere un nuovo codice con «Invia di nuovo».'); return; }
    post('/api/auth/verify-email-link', { token: token })
      .then(function (j) { say('Email confermata' + (j.email ? ' (' + j.email + ')' : '') + '.'); done(); })
      .catch(function (e) { say(e.message); });
    return;
  }

  if (/\/reimposta-password/.test(location.pathname)) {
    if (!token) { if ($('reset-nolink')) $('reset-nolink').hidden = false; return; }
    var form = $('reset-form');
    form.hidden = false;
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var pw = $('reset-pw').value;
      var pw2 = $('reset-pw2').value;
      if (pw.length < 8) { say('La password deve avere almeno 8 caratteri.'); return; }
      if (pw !== pw2) { say('Le due password non coincidono.'); return; }
      var btn = $('reset-submit');
      btn.disabled = true;
      say('Salvataggio…');
      post('/api/auth/reset-password-link', { token: token, password: pw })
        .then(function () { form.hidden = true; say(''); done(); })
        .catch(function (e) { say(e.message); btn.disabled = false; });
    });
  }
})();
