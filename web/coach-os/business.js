(function () {
  'use strict';
  const CoachOS = window.CoachOS;
  if (!CoachOS) return;

  function escText(value) {
    if (typeof window.esc === 'function') return window.esc(String(value || ''));
    return String(value || '').replace(/[&<>"']/g, '');
  }

  function tx(key) {
    return CoachOS.t ? CoachOS.t(key) : key;
  }

  function euros(cents) {
    return '€' + (Number(cents || 0) / 100).toFixed(0);
  }

  /*
   * Incassi: the coach's own record of what clients paid. No money moves
   * through the app - it is a ledger kept by hand, with the figure optional:
   * a payment written without one is listed and left out of the totals.
   * Totals: everything, this year, this month, the last 30 days, month by
   * month and client by client; and the sessions done in person and at a
   * distance, for who charges them differently.
   */
  const METHODS = [['cash', 'Contanti'], ['transfer', 'Bonifico'], ['card', 'Carta'], ['other', 'Altro']];
  const LABELS = ['Mensile coaching', 'Pacchetto di sedute', 'Seduta in presenza', 'Programma', 'Altro'];
  const ledger = { events: [], totals: null, sessions: [], clients: [], failed: false };
  function T(text) { return typeof window.tr === 'function' ? window.tr(text) : text; }
  function locale() { try { return (document.documentElement && document.documentElement.lang) || 'it-IT'; } catch (_) { return 'it-IT'; } }
  function money(cents) {
    try { return new Intl.NumberFormat(locale(), { style: 'currency', currency: 'EUR' }).format((Number(cents) || 0) / 100); }
    catch (_) { return '€ ' + ((Number(cents) || 0) / 100).toFixed(2); }
  }
  function methodLabel(id) {
    const hit = METHODS.filter(function (m) { return m[0] === id; })[0];
    return hit ? T(hit[1]) : '';
  }
  function monthLabel(key) {
    try { return new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(new Date(key + '-15T12:00:00')); } catch (_) { return key; }
  }
  function dayLabel(iso) {
    try { return new Intl.DateTimeFormat(locale(), { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso)); } catch (_) { return String(iso).slice(0, 10); }
  }
  // "12,50" / "12.5" / "1.250,00" -> cents; '' -> null (no figure given).
  function parseAmount(text) {
    const raw = String(text == null ? '' : text).trim().replace(/\s|€/g, '');
    if (!raw) return null;
    const norm = raw.indexOf(',') >= 0 ? raw.replace(/\./g, '').replace(',', '.') : raw;
    const n = Number(norm);
    if (!isFinite(n) || n < 0) return NaN;
    return Math.round(n * 100);
  }

  function renderLedger(container) {
    const t = ledger.totals || { allCents: 0, yearCents: 0, monthCents: 0, last30Cents: 0, count: 0, withoutAmount: 0, byMonth: [], byClient: [] };
    const paid = ledger.events.filter(function (e) { return e.kind === 'paid'; });
    const byMonth = {};
    paid.forEach(function (e) { const d = new Date(e.occurredAt); const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); (byMonth[k] = byMonth[k] || []).push(e); });
    const monthTotal = {};
    (t.byMonth || []).forEach(function (m) { monthTotal[m.month] = m; });
    // Sessions that took place, per client: in person / at a distance.
    const perClient = {};
    (ledger.sessions || []).forEach(function (s) {
      const k = s.clientId || '-';
      const row = perClient[k] = perClient[k] || { name: s.clientName || T('Senza cliente'), presence: 0, remote: 0, unknown: 0 };
      if (s.mode === 'presence') row.presence += s.count; else if (s.mode === 'remote') row.remote += s.count; else row.unknown += s.count;
    });
    const sessionRows = Object.keys(perClient).map(function (k) { return perClient[k]; }).sort(function (x, y) { return (y.presence + y.remote + y.unknown) - (x.presence + x.remote + x.unknown); });
    container.innerHTML =
      '<div class="coach-os-page" id="coach-ledger-page">' +
      '<div class="coach-os-page-header"><div><div class="coach-os-eyebrow">' + escText(T('Coach')) + '</div>' +
      '<h1 class="coach-os-title">' + escText(T('Incassi')) + '</h1>' +
      '<p class="coach-os-subtitle">' + escText(T('Il tuo registro di quello che i clienti ti pagano. Lo tieni tu: dall’app non passa nessun pagamento.')) + '</p></div>' +
      '<button class="btn btn-primary" onclick="CoachOS.openPaymentForm()">' + escText(T('REGISTRA INCASSO')) + '</button></div>' +
      (ledger.failed ? '<div class="coach-os-empty">' + escText(T('Registro non disponibile adesso. Riprova tra poco.')) + '</div>' : '') +
      '<div class="coach-os-card coach-os-kpis">' +
      [[T('Totale incassato'), money(t.allCents)], [T('Quest’anno'), money(t.yearCents)], [T('Questo mese'), money(t.monthCents)], [T('Ultimi 30 giorni'), money(t.last30Cents)]]
        .map(function (row) { return '<div class="coach-os-kpi"><strong>' + escText(row[1]) + '</strong><span>' + escText(row[0]) + '</span></div>'; }).join('') + '</div>' +
      '<p class="coach-os-subtitle" style="margin:8px 0 0;">' + escText(t.count + ' ' + T(t.count === 1 ? 'incasso registrato' : 'incassi registrati')) +
      (t.withoutAmount ? ' · ' + escText(t.withoutAmount + ' ' + T('senza cifra, non contati nei totali')) : '') + '</p>' +
      '<div class="coach-os-quick-actions"><button class="coach-os-action" onclick="CoachOS.exportLedgerCsv()">' + escText(T('Esporta in CSV')) + '</button></div>' +
      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">' + escText(T('Per cliente')) + '</h2></div>' +
      ((t.byClient || []).length
        ? '<div class="coach-os-list">' + t.byClient.map(function (c) {
          return '<div class="coach-os-row"><span class="coach-os-row-main"><strong>' + escText(c.clientName || T('Cliente')) + '</strong><span>' + escText(c.count + ' ' + T(c.count === 1 ? 'incasso' : 'incassi')) + '</span></span><strong>' + escText(money(c.cents)) + '</strong></div>';
        }).join('') + '</div>'
        : '<div class="coach-os-empty">' + escText(T('Ancora nessun incasso. Con REGISTRA INCASSO scrivi il primo.')) + '</div>') + '</section>' +
      '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">' + escText(T('Sedute fatte negli ultimi 12 mesi')) + '</h2></div>' +
      (sessionRows.length
        ? '<div class="coach-os-list">' + sessionRows.map(function (r) {
          return '<div class="coach-os-row"><span class="coach-os-row-main"><strong>' + escText(r.name) + '</strong><span>' +
            escText(T('in presenza') + ': ' + r.presence + ' · ' + T('a distanza') + ': ' + r.remote + (r.unknown ? ' · ' + T('non indicato') + ': ' + r.unknown : '')) + '</span></span></div>';
        }).join('') + '</div>'
        : '<div class="coach-os-empty">' + escText(T('Compaiono qui le sessioni del calendario segnate come fatte.')) + '</div>') + '</section>' +
      Object.keys(byMonth).sort().reverse().map(function (k) {
        const mt = monthTotal[k] || { cents: 0 };
        return '<section class="coach-os-section"><div class="coach-os-section-head"><h2 class="coach-os-section-title">' + escText(monthLabel(k)) + ' · ' + escText(money(mt.cents)) + '</h2></div>' +
          '<div class="coach-os-list">' + byMonth[k].map(function (e) {
            const bits = [dayLabel(e.occurredAt), e.label ? T(e.label) : '', methodLabel(e.method), e.note].filter(Boolean);
            return '<div class="coach-os-row" style="flex-wrap:wrap;gap:8px;"><span class="coach-os-row-main"><strong>' + escText(e.clientName || T('Cliente')) + '</strong><span>' + escText(bits.join(' · ')) + '</span></span>' +
              '<strong>' + escText(e.hasAmount === false ? T('senza cifra') : money(e.amountCents)) + '</strong>' +
              '<button class="btn btn-outline" style="font-size:9px;color:#c66;border-color:#c66;" onclick="CoachOS.deletePayment(\'' + escText(e.id) + '\')">' + escText(T('ELIMINA')) + '</button></div>';
          }).join('') + '</div></section>';
      }).join('') +
      '</div>';
  }

  async function loadLedger() {
    const data = await window.practiceFetch('/api/coach/business', { headers: window.practiceHeaders() });
    ledger.events = data.events || [];
    ledger.totals = data.totals || null;
    ledger.sessions = data.sessions || [];
    ledger.failed = false;
  }
  async function refreshLedger() {
    try { await loadLedger(); } catch (_) { ledger.failed = true; }
    const page = document.getElementById('coach-ledger-page');
    if (page && page.parentNode) renderLedger(page.parentNode);
  }

  CoachOS.views.coachBusiness = async function (container) {
    // Billing clients belongs to the Coach plan (web/features.json).
    if (typeof planCan === 'function' && !planCan('client_billing')) {
      container.innerHTML = '<div class="coach-os-page">' + planLockedHtml('client_billing') + '</div>';
      return;
    }
    if (ledger.totals || ledger.failed) renderLedger(container);
    else container.innerHTML = '<div class="coach-os-skeleton">' + escText(T('Carico il registro…')) + '</div>';
    try { await loadLedger(); } catch (_) { ledger.failed = true; }
    if (typeof currentView === 'undefined' || currentView === 'coachBusiness') renderLedger(container);
  };

  function closePaymentForm() { const el = document.getElementById('coach-payment-form'); if (el) el.remove(); }
  CoachOS.closePaymentForm = closePaymentForm;
  CoachOS.openPaymentForm = async function () {
    closePaymentForm();
    if (!ledger.clients.length) {
      try {
        const payload = await window.practiceFetch('/api/coach/clients?limit=200&offset=0&q=', { method: 'GET', headers: window.practiceHeaders(false) }, 20000);
        ledger.clients = (payload.clients || []).map(function (c) { return { id: String(c.id), name: c.displayName || c.username || ('Cliente ' + c.id) }; });
      } catch (_) {}
    }
    const today = new Date();
    const iso = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const field = 'width:100%;margin-top:4px;padding:10px;background:#111;border:1px solid #333;color:#fff;border-radius:8px;font-size:16px;box-sizing:border-box;';
    const label = function (text) { return '<label style="font-size:10px;color:#ccc;font-weight:800;display:block;margin-top:10px;">' + escText(T(text)); };
    const preset = store.coachWorkspace && store.coachWorkspace.clientId ? String(store.coachWorkspace.clientId) : '';
    const el = document.createElement('div');
    el.id = 'coach-payment-form';
    el.style.cssText = 'display:flex;position:fixed;inset:0;z-index:100015;background:rgba(0,0,0,.88);align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
    el.onclick = function (ev) { if (ev.target === el) closePaymentForm(); };
    el.innerHTML = '<div class="card" style="max-width:440px;width:100%;max-height:100%;overflow-y:auto;border:1px solid var(--gold);padding:16px;box-sizing:border-box;margin:0;">' +
      '<div style="font-size:14px;font-weight:900;color:var(--gold);">' + escText(T('Registra un incasso')) + '</div>' +
      label('Cliente') + '<select id="pay-client" style="' + field + '">' +
      (ledger.clients.length ? '' : '<option value="">' + escText(T('Nessun cliente')) + '</option>') +
      ledger.clients.map(function (c) { return '<option value="' + escText(c.id) + '"' + (c.id === preset ? ' selected' : '') + '>' + escText(c.name) + '</option>'; }).join('') + '</select></label>' +
      label('Importo in euro (facoltativo)') + '<input id="pay-amount" type="text" inputmode="decimal" placeholder="0,00" style="' + field + '"></label>' +
      label('Data') + '<input id="pay-date" type="date" value="' + iso + '" style="' + field + '"></label>' +
      label('Per cosa') + '<select id="pay-label" style="' + field + '">' + LABELS.map(function (l) { return '<option value="' + escText(l) + '">' + escText(T(l)) + '</option>'; }).join('') + '</select></label>' +
      label('Come') + '<select id="pay-method" style="' + field + '">' + METHODS.map(function (m) { return '<option value="' + m[0] + '">' + escText(T(m[1])) + '</option>'; }).join('') + '</select></label>' +
      label('Nota (facoltativa)') + '<input id="pay-note" type="text" maxlength="200" style="' + field + '"></label>' +
      '<div id="pay-error" style="font-size:12px;color:#ff8a80;min-height:16px;margin-top:10px;"></div>' +
      '<div style="display:grid;gap:8px;margin-top:6px;">' +
      '<button type="button" class="btn btn-primary" id="pay-save" onclick="CoachOS.savePaymentForm()">' + escText(T('SALVA')) + '</button>' +
      '<button type="button" class="btn btn-outline" onclick="CoachOS.closePaymentForm()">' + escText(T('CHIUDI')) + '</button>' +
      '</div></div>';
    document.body.appendChild(el);
  };
  CoachOS.savePaymentForm = async function () {
    const val = function (x) { const el = document.getElementById(x); return el ? String(el.value || '').trim() : ''; };
    const err = document.getElementById('pay-error');
    const say = function (m) { if (err) err.textContent = T(m); };
    const clientId = val('pay-client');
    if (!clientId) { say('Scegli il cliente.'); return; }
    const cents = parseAmount(val('pay-amount'));
    if (cents !== null && isNaN(cents)) { say('Importo non valido: scrivi una cifra, per esempio 80 o 80,50.'); return; }
    const date = val('pay-date');
    const btn = document.getElementById('pay-save');
    if (btn) btn.disabled = true;
    try {
      await window.practiceFetch('/api/coach/business/payments', {
        method: 'POST', headers: window.practiceHeaders(true),
        body: JSON.stringify({
          clientId: clientId, kind: 'paid', amountCents: cents,
          // Noon, so the day does not slip with the time zone.
          occurredAt: date ? new Date(date + 'T12:00:00').toISOString() : null,
          method: val('pay-method'), label: val('pay-label'), note: val('pay-note')
        })
      });
      closePaymentForm();
      if (typeof window.practiceToast === 'function') window.practiceToast(T('Incasso registrato'), 'success');
      await refreshLedger();
    } catch (error) {
      say((error && error.message) || 'Incasso non salvato. Riprova.');
      if (btn) btn.disabled = false;
    }
  };
  CoachOS.deletePayment = async function (id) {
    if (!window.confirm(T('Eliminare questo incasso dal registro?'))) return;
    try {
      await window.practiceFetch('/api/coach/business/payments/' + encodeURIComponent(id), { method: 'DELETE', headers: window.practiceHeaders(false) });
      await refreshLedger();
    } catch (error) {
      if (typeof window.practiceToast === 'function') window.practiceToast((error && error.message) || T('Incasso non eliminato.'), 'danger');
    }
  };
  CoachOS.exportLedgerCsv = function () {
    const cell = function (v) { const s = String(v == null ? '' : v); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const rows = [['data', 'cliente', 'per cosa', 'come', 'importo', 'nota'].join(';')].concat(
      ledger.events.filter(function (e) { return e.kind === 'paid'; }).map(function (e) {
        return [String(e.occurredAt).slice(0, 10), e.clientName || '', e.label || '', methodLabel(e.method), e.hasAmount === false ? '' : ((Number(e.amountCents) || 0) / 100).toFixed(2).replace('.', ','), e.note || ''].map(cell).join(';');
      }));
    const blob = new Blob(['﻿' + rows.join('\n') + '\n'], { type: 'text/csv;charset=utf-8' });
    if (typeof window.downloadBlobHelper === 'function') { window.downloadBlobHelper(blob, 'nurvan-incassi.csv'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'nurvan-incassi.csv';
    document.body.appendChild(a); a.click(); a.remove();
  };
  CoachOS.ledgerTestHooks = { parseAmount: parseAmount, ledger: ledger, METHODS: METHODS, LABELS: LABELS };

  CoachOS.views.coachCrm = async function (container) {
    let rows = [];
    try {
      const data = await window.practiceFetch('/api/coach/crm', { headers: window.practiceHeaders() });
      rows = data.pipeline || [];
    } catch (_) {
      rows = [];
    }
    container.innerHTML =
      '<div class="coach-os-page"><div class="coach-os-page-header"><div><div class="coach-os-eyebrow">' + escText(tx('coCrm')) + '</div>' +
      '<h1 class="coach-os-title">' + escText(tx('coCrm')) + '</h1></div></div>' +
      (rows.length
        ? '<div class="coach-os-list">' + rows.map(function (row) {
          return '<button class="coach-os-row" onclick="openCoachClient(\'' + escText(row.id) + '\')"><span class="coach-os-row-main"><strong>' +
            escText(row.name) + '</strong><span>' + escText(row.stage) + (row.nextAction ? ' · ' + escText(row.nextAction) : '') +
            '</span></span></button>';
        }).join('') + '</div>'
        : '<div class="coach-os-empty">' + escText(tx('coCrmEmpty')) + '</div>') + '</div>';
  };

  CoachOS.views.coachAutomations = async function (container) {
    let rows = [];
    try {
      const data = await window.practiceFetch('/api/coach/automations', { headers: window.practiceHeaders() });
      rows = data.rules || [];
    } catch (_) {
      rows = [];
    }
    container.innerHTML =
      '<div class="coach-os-page"><div class="coach-os-page-header"><div><div class="coach-os-eyebrow">' + escText(tx('coRules')) + '</div>' +
      '<h1 class="coach-os-title">' + escText(tx('coAutomations')) + '</h1><p class="coach-os-subtitle">' + escText(tx('coAutomationsSubtitle')) + '</p></div>' +
      '<button class="btn btn-outline" onclick="CoachOS.createAutomationPrompt()">' + escText(tx('coNewRule')) + '</button></div>' +
      (rows.length
        ? '<div class="coach-os-list">' + rows.map(function (row) {
          return '<div class="coach-os-row"><span class="coach-os-row-main"><strong>' + escText(row.name) +
            '</strong><span>' + escText(row.trigger) + ' → ' + escText(row.action) + '</span></span>' +
            '<button class="btn btn-outline" style="font-size:9px;" onclick="CoachOS.dryRunAutomation(\'' +
            escText(row.id) + '\')">' + escText(tx('coDryRun')) + '</button>' +
            '<button class="btn btn-outline" style="font-size:9px;" onclick="CoachOS.runAutomationNow(\'' +
            escText(row.id) + '\')">' + escText(tx('coRun')) + '</button></div>';
        }).join('') + '</div>'
        : '<div class="coach-os-empty">' + escText(tx('coNoAutomations')) + '</div>') + '</div>';
  };

  CoachOS.createAutomationPrompt = async function () {
    const name = window.prompt(tx('coAutomationName'), tx('coAutomationDefault'));
    if (!name) return;
    await window.practiceFetch('/api/coach/automations', {
      method: 'POST',
      headers: window.practiceHeaders(true),
      body: JSON.stringify({ name: name, trigger: 'check_in_received', action: 'create_task' })
    });
    CoachOS.navigate('coachAutomations');
  };

  CoachOS.dryRunAutomation = async function (id) {
    const payload = await window.practiceFetch('/api/coach/automations/' + encodeURIComponent(id) + '/dry-run', {
      method: 'POST',
      headers: window.practiceHeaders(true),
      body: JSON.stringify({})
    });
    if (typeof practiceToast === 'function') practiceToast(tx('coDryRunPrefix') + ' ' + (payload.preview && payload.preview.action), 'info');
  };

  CoachOS.runAutomationNow = async function (id) {
    const payload = await window.practiceFetch('/api/coach/automations/' + encodeURIComponent(id) + '/run', {
      method: 'POST',
      headers: window.practiceHeaders(true),
      body: JSON.stringify({})
    });
    const failed = payload.result && payload.result.failed;
    if (typeof practiceToast === 'function') {
      practiceToast(failed ? tx('coAutomationFailed') : tx('coAutomationRan'), failed ? 'danger' : 'success');
    }
  };
})();
