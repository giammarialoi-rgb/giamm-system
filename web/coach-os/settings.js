(function () {
  'use strict';
  const CoachOS = window.CoachOS;
  if (!CoachOS) return;

  function escText(value) {
    if (typeof window.esc === 'function') return window.esc(String(value || ''));
    return String(value || '').replace(/[&<>"']/g, '');
  }
  function T(text) { return typeof window.tr === 'function' ? window.tr(text) : text; }
  function builtins() { return (typeof CLIENT_INTAKE_FIELDS !== 'undefined' && Array.isArray(CLIENT_INTAKE_FIELDS)) ? CLIENT_INTAKE_FIELDS : []; }

  /*
   * Impostazioni coaching: everything the coach can set about how they work with clients, in one place - the brand
   * (name and logo), the questionnaire a new client answers, the invite text, the presence and video-call switches, and the
   * books. The questionnaire is the coach's own: the app's questions can be hidden, renamed, made required or not, given
   * other choices; and the coach adds questions of their own (open, one choice, several choices - the choices decided
   * first). See server/coach-os/settings.mjs for how they are stored and checked.
   */
  CoachOS.views.coachSettings = function (container) {
    const card = function (title, text, action, label) {
      return '<div class="coach-os-card" style="padding:14px;margin-bottom:10px;">' +
        '<div style="font-weight:900;color:var(--gold);">' + escText(T(title)) + '</div>' +
        '<p class="coach-os-subtitle" style="margin:6px 0 10px;">' + escText(T(text)) + '</p>' +
        '<button type="button" class="btn btn-outline" style="width:100%;" onclick="' + action + '">' + escText(T(label)) + '</button></div>';
    };
    const toggle = function (text, checked, handler) {
      return '<label style="display:flex;gap:10px;align-items:flex-start;font-size:13px;color:#eee;padding:10px;background:#141414;border:1px solid #333;border-radius:10px;margin-bottom:8px;">' +
        '<input type="checkbox" ' + (checked ? 'checked ' : '') + 'onchange="' + handler + '(this.checked)" style="margin-top:2px;flex-shrink:0;width:18px;height:18px;">' +
        '<span style="flex:1;line-height:1.35;">' + escText(T(text)) + '</span></label>';
    };
    container.innerHTML = '<div class="coach-os-page" id="coach-settings-page">' +
      '<div class="coach-os-page-header"><div><div class="coach-os-eyebrow">' + escText(T('Coach')) + '</div>' +
      '<h1 class="coach-os-title">' + escText(T('Impostazioni coaching')) + '</h1>' +
      '<p class="coach-os-subtitle">' + escText(T('Tutto quello che puoi personalizzare del tuo modo di lavorare con i clienti.')) + '</p></div></div>' +
      card('Il tuo marchio', 'Nome e logo che i clienti vedono nella loro app e come icona sulla Home.', "CoachOS.navigate('coachBrand')", 'APRI') +
      card('Questionario dei nuovi clienti', 'Le domande che un nuovo cliente compila: cambiale, toglile, aggiungine di tue.', "CoachOS.navigate('coachIntake')", 'APRI') +
      card('Testo dell’invito', 'Il messaggio con il link che mandi ai clienti.', 'openInviteTemplateEditor()', 'APRI') +
      card('Gestionale', 'Incassi, spese, utile e scadenze.', "CoachOS.navigate('coachBusiness')", 'APRI') +
      '<div class="coach-os-card" style="padding:14px;">' +
      '<div style="font-weight:900;color:var(--gold);margin-bottom:8px;">' + escText(T('Presenza e chiamate')) + '</div>' +
      toggle('Nascondi che sei online ai clienti', !!(store && store.coachHidePresence), 'toggleCoachHidePresence') +
      toggle('Consenti videocall interne con i clienti', !(store && store.coachAllowVideocall === false), 'toggleCoachVideocall') +
      '</div></div>';
  };

  /* ---- the questionnaire editor ---- */
  const ed = { rows: {}, custom: [], loaded: false, busy: false };
  const TYPES = [['text', 'Testo libero'], ['choice', 'Una risposta'], ['multi', 'Più risposte']];

  function load(config) {
    const cfg = config && typeof config === 'object' ? config : {};
    const hidden = {};
    (cfg.hidden || []).forEach(function (k) { hidden[k] = true; });
    ed.rows = {};
    builtins().forEach(function (f) {
      const o = (cfg.overrides || {})[f.key] || {};
      ed.rows[f.key] = {
        ask: !hidden[f.key],
        label: o.label || f.label,
        required: typeof o.required === 'boolean' ? o.required : !!f.required,
        optionsText: (f.type === 'select' ? (Array.isArray(o.options) && o.options.length ? o.options : f.options) : []).join('\n')
      };
    });
    ed.custom = (cfg.custom || []).map(function (q) {
      return { id: q.id, label: q.label || '', type: q.type || 'text', required: !!q.required, optionsText: (q.options || []).join('\n') };
    });
    ed.loaded = true;
  }
  const lines = function (text) { return String(text || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); };

  // The settings as the server stores them: only what differs from the app's own questions.
  function toConfig() {
    const cfg = { hidden: [], overrides: {}, custom: [] };
    builtins().forEach(function (f) {
      const r = ed.rows[f.key];
      if (!r) return;
      if (!r.ask) cfg.hidden.push(f.key);
      const o = {};
      if (String(r.label || '').trim() && r.label.trim() !== f.label) o.label = r.label.trim();
      if (!!r.required !== !!f.required) o.required = !!r.required;
      if (f.type === 'select') {
        const opts = lines(r.optionsText);
        if (opts.length >= 2 && opts.join('\n') !== f.options.join('\n')) o.options = opts;
      }
      if (Object.keys(o).length) cfg.overrides[f.key] = o;
    });
    ed.custom.forEach(function (q) {
      const entry = { id: q.id, label: String(q.label || '').trim(), type: q.type, required: !!q.required };
      if (q.type !== 'text') entry.options = lines(q.optionsText);
      cfg.custom.push(entry);
    });
    return cfg;
  }

  function problem() {
    for (let i = 0; i < ed.custom.length; i++) {
      const q = ed.custom[i];
      if (!String(q.label || '').trim()) return 'Scrivi il testo di ogni domanda.';
      if (q.type !== 'text' && lines(q.optionsText).length < 2) return 'Una domanda a risposta multipla ha bisogno di almeno due risposte.';
    }
    const keys = Object.keys(ed.rows);
    for (let j = 0; j < keys.length; j++) {
      const r = ed.rows[keys[j]];
      if (r.ask && !String(r.label || '').trim()) return 'Scrivi il testo di ogni domanda.';
    }
    return '';
  }

  function say(message) {
    const el = document.getElementById('intake-msg');
    if (el) el.textContent = message ? T(message) : '';
  }

  function render(container) {
    const field = 'width:100%;margin-top:4px;padding:10px;background:#111;border:1px solid #333;color:#fff;border-radius:8px;font-size:15px;box-sizing:border-box;';
    const small = 'font-size:10px;color:#ccc;font-weight:800;display:block;margin-top:8px;';
    const check = function (checked, handler, text) {
      return '<label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#eee;margin-right:14px;"><input type="checkbox" ' + (checked ? 'checked ' : '') + 'onchange="' + handler + '(this.checked)"> ' + escText(T(text)) + '</label>';
    };
    const builtinHtml = builtins().map(function (f) {
      const r = ed.rows[f.key];
      const k = escText(f.key);
      return '<div style="padding:10px 0;border-bottom:1px solid #222;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">' +
        '<div>' + check(r.ask, "CoachOS.intakeSet.bind(null,'" + k + "','ask')", 'Chiedila') + (r.ask ? check(r.required, "CoachOS.intakeSet.bind(null,'" + k + "','required')", 'Obbligatoria') : '') + '</div>' +
        (r.ask && f.type === 'select' ? '<button type="button" class="btn btn-outline" style="font-size:9px;padding:4px 8px;" onclick="CoachOS.intakeToggleOptions(\'' + k + '\')">' + escText(T('SCELTE')) + '</button>' : '') + '</div>' +
        (r.ask ? '<input type="text" maxlength="80" value="' + escText(r.label) + '" aria-label="' + escText(T('Testo della domanda')) + '" oninput="CoachOS.intakeSet(\'' + k + '\',\'label\',this.value)" style="' + field + '">' : '<div style="font-size:12px;color:#777;margin-top:4px;">' + escText(f.label) + '</div>') +
        (r.ask && f.type === 'select' ? '<div id="ik-opts-' + k + '" style="display:none;"><label style="' + small + '">' + escText(T('Risposte (una per riga)')) + '<textarea rows="5" oninput="CoachOS.intakeSet(\'' + k + '\',\'optionsText\',this.value)" style="' + field + 'font-size:13px;">' + escText(r.optionsText) + '</textarea></label></div>' : '') +
        '</div>';
    }).join('');
    const customHtml = ed.custom.map(function (q, i) {
      return '<div style="padding:12px;margin-top:10px;border:1px solid #333;border-radius:10px;background:#141414;">' +
        '<label style="' + small + 'margin-top:0;">' + escText(T('Testo della domanda')) + '<input type="text" maxlength="120" value="' + escText(q.label) + '" oninput="CoachOS.intakeCustomSet(' + i + ',\'label\',this.value)" style="' + field + '"></label>' +
        '<label style="' + small + '">' + escText(T('Tipo')) + '<select onchange="CoachOS.intakeCustomSet(' + i + ',\'type\',this.value);CoachOS.intakeRedraw()" style="' + field + '">' +
        TYPES.map(function (t) { return '<option value="' + t[0] + '"' + (q.type === t[0] ? ' selected' : '') + '>' + escText(T(t[1])) + '</option>'; }).join('') + '</select></label>' +
        (q.type !== 'text' ? '<label style="' + small + '">' + escText(T('Risposte (una per riga)')) + '<textarea rows="4" oninput="CoachOS.intakeCustomSet(' + i + ',\'optionsText\',this.value)" style="' + field + 'font-size:13px;">' + escText(q.optionsText) + '</textarea></label>' : '') +
        '<div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;gap:8px;">' + check(q.required, 'CoachOS.intakeCustomSet.bind(null,' + i + ",'required')", 'Obbligatoria') +
        '<button type="button" class="btn btn-outline" style="font-size:9px;color:#c66;border-color:#c66;" onclick="CoachOS.intakeCustomRemove(' + i + ')">' + escText(T('ELIMINA')) + '</button></div></div>';
    }).join('');
    container.innerHTML = '<div class="coach-os-page" id="coach-intake-page">' +
      '<div class="coach-os-page-header"><div><div class="coach-os-eyebrow">' + escText(T('Impostazioni coaching')) + '</div>' +
      '<h1 class="coach-os-title">' + escText(T('Questionario dei nuovi clienti')) + '</h1>' +
      '<p class="coach-os-subtitle">' + escText(T('È quello che compila un nuovo cliente al primo accesso. Puoi cambiare le domande che ci sono, toglierne e aggiungerne di tue, anche a risposta multipla (decidi prima le risposte). Alcune domande servono a scrivere le schede: se le togli, quei dati restano vuoti.')) + '</p></div></div>' +
      '<div class="coach-os-card" style="padding:14px;">' +
      '<div style="font-weight:900;color:var(--gold);">' + escText(T('Domande dell’app')) + '</div>' + builtinHtml + '</div>' +
      '<div class="coach-os-card" style="padding:14px;margin-top:12px;">' +
      '<div style="font-weight:900;color:var(--gold);">' + escText(T('Le tue domande')) + '</div>' + customHtml +
      '<button type="button" class="btn btn-outline" style="width:100%;margin-top:12px;" onclick="CoachOS.intakeCustomAdd()">' + escText(T('AGGIUNGI DOMANDA')) + '</button></div>' +
      '<div id="intake-msg" style="font-size:12px;color:#ff8a80;min-height:16px;margin-top:10px;"></div>' +
      '<div style="display:grid;gap:8px;margin-top:6px;">' +
      '<button type="button" class="btn btn-outline" onclick="CoachOS.intakePreview()">' + escText(T('ANTEPRIMA')) + '</button>' +
      '<button type="button" class="btn btn-primary" id="intake-save" onclick="CoachOS.intakeSave()">' + escText(T('SALVA')) + '</button>' +
      '<button type="button" class="btn btn-outline" style="color:#c66;border-color:#c66;" onclick="CoachOS.intakeReset()">' + escText(T('RIPRISTINA TUTTO')) + '</button></div></div>';
  }
  function redraw() {
    const page = document.getElementById('coach-intake-page');
    if (page && page.parentNode) { const y = window.scrollY; render(page.parentNode); try { window.scrollTo(0, y); } catch (_) {} }
  }

  CoachOS.intakeSet = function (key, field, value) { if (ed.rows[key]) { ed.rows[key][field] = value; if (field === 'ask' || field === 'required') redraw(); } };
  CoachOS.intakeCustomSet = function (i, field, value) { if (ed.custom[i]) ed.custom[i][field] = value; };
  CoachOS.intakeRedraw = redraw;
  CoachOS.intakeToggleOptions = function (key) { const el = document.getElementById('ik-opts-' + key); if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none'; };
  CoachOS.intakeCustomAdd = function () {
    ed.custom.push({ id: 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), label: '', type: 'text', required: false, optionsText: '' });
    redraw();
  };
  CoachOS.intakeCustomRemove = function (i) { ed.custom.splice(i, 1); redraw(); };

  CoachOS.intakePreview = function () {
    const message = problem();
    if (message) { say(message); return; }
    say('');
    const backup = window.__cpIntakeConfig;
    window.__cpIntakeConfig = toConfig();
    let html = '';
    try { html = intakeFormHtml('prev', {}); } finally { window.__cpIntakeConfig = backup; }
    openCpModal('<h2>' + escText(T('Anteprima del questionario')) + '</h2><div style="max-height:60vh;overflow:auto;">' + html + '</div>' +
      '<button class="btn btn-outline" style="width:100%;margin-top:10px;" onclick="closeCpModal()">' + escText(T('CHIUDI')) + '</button>');
  };

  CoachOS.intakeSave = async function () {
    if (ed.busy) return;
    const message = problem();
    if (message) { say(message); return; }
    ed.busy = true;
    const btn = document.getElementById('intake-save');
    if (btn) btn.disabled = true;
    try {
      const data = await window.practiceFetch('/api/coach/settings/intake', { method: 'PUT', headers: window.practiceHeaders(true), body: JSON.stringify({ config: toConfig() }) }, 20000);
      window.__cpIntakeConfig = data.config;
      window.__cpIntakeConfigFor = String((store && store.accountUser && store.accountUser.id) || '');
      load(data.config);
      if (typeof window.practiceToast === 'function') window.practiceToast(T('Questionario salvato'), 'success');
      redraw();
    } catch (error) {
      say((error && error.message) || 'Questionario non salvato. Riprova.');
      if (btn) btn.disabled = false;
    }
    ed.busy = false;
  };

  CoachOS.intakeReset = async function () {
    if (!window.confirm(T('Ripristinare il questionario di Nurvan? Le tue modifiche e le tue domande vanno perse.'))) return;
    try {
      const data = await window.practiceFetch('/api/coach/settings/intake', { method: 'PUT', headers: window.practiceHeaders(true), body: JSON.stringify({ config: {} }) }, 20000);
      window.__cpIntakeConfig = data.config;
      load(data.config);
      redraw();
    } catch (error) {
      say((error && error.message) || 'Questionario non salvato. Riprova.');
    }
  };

  CoachOS.views.coachIntake = async function (container) {
    container.innerHTML = '<div class="coach-os-skeleton">' + escText(T('Carico…')) + '</div>';
    let cfg = null;
    try { cfg = await window.ensureIntakeConfig(true); } catch (_) {}
    load(cfg);
    if (typeof currentView === 'undefined' || currentView === 'coachIntake') render(container);
  };

  CoachOS.intakeTestHooks = { load: load, toConfig: toConfig, problem: problem, ed: ed };
})();
