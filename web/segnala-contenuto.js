// The form of /segnala-contenuto (notices of illegal content, Digital Services Act art. 16).
// The words it shows are in the page (#report-messages), so every translation of the page
// speaks its own language; the server answers with a code for each problem.
(function () {
  var form = document.getElementById('report-form');
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var msg = function (code) {
    var el = document.querySelector('#report-messages [data-msg="' + code + '"]');
    return el ? el.textContent : code;
  };
  var result = $('report-result');
  var say = function (text, good) {
    result.textContent = text;
    result.hidden = false;
    result.className = 'report-result ' + (good ? 'good' : 'bad');
  };
  var anonymous = function () { return $('report-kind').value === 'csam'; };
  var emailOk = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var body = {
      kind: $('report-kind').value,
      location: $('report-location').value.trim(),
      explanation: $('report-explanation').value.trim(),
      name: $('report-name').value.trim(),
      email: $('report-email').value.trim(),
      goodFaith: $('report-good-faith').checked,
      lang: (document.documentElement.getAttribute('lang') || 'it').slice(0, 2)
    };
    var problem = !body.kind ? 'KIND'
      : body.location.length < 3 ? 'LOCATION'
      : body.explanation.length < 10 ? 'EXPLANATION'
      : (!anonymous() && body.name.length < 2) ? 'NAME'
      : ((!anonymous() || body.email) && !emailOk(body.email)) ? 'EMAIL'
      : !body.goodFaith ? 'GOOD_FAITH' : '';
    if (problem) { say(msg(problem), false); return; }
    var button = $('report-send');
    button.disabled = true;
    say(msg('SENDING'), true);
    fetch('/api/content-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (out) {
        if (out.ok && out.j && out.j.ok) {
          say(msg('OK').replace('{id}', String(out.j.id)), true);
          form.reset();
          return;
        }
        var code = out.j && out.j.code;
        say(code && document.querySelector('#report-messages [data-msg="' + code + '"]') ? msg(code) : msg('FAIL'), false);
      })
      .catch(function () { say(msg('FAIL'), false); })
      .then(function () { button.disabled = false; });
  });
})();
