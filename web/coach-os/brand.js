(function () {
  'use strict';
  const CoachOS = window.CoachOS;
  if (!CoachOS) return;

  function escText(value) {
    if (typeof window.esc === 'function') return window.esc(String(value || ''));
    return String(value || '').replace(/[&<>"']/g, '');
  }
  function T(text) { return typeof window.tr === 'function' ? window.tr(text) : text; }

  /*
   * Il tuo marchio: the coach's (or gym's) name and logo. The coach picks an image, crops it to a square by dragging
   * and zooming, and "powered by Nurvan" is laid over its lower edge; what is drawn here is the icon itself, made in
   * the three sizes a Home-screen icon needs and sent to the server (see server/coach-os/branding.mjs). The icon is
   * the one of the web app a client installs from the coach's link: a store app has one icon for everybody.
   */
  const PREVIEW = 280;
  const SIZES = [512, 192, 180];
  const state = { img: null, zoom: 1, ox: 0, oy: 0, name: '', saved: { name: '', hasLogo: false }, busy: false };

  // Draws the icon at `size`: the picture covering the square, the strip "powered by Nurvan" on its lower edge.
  function drawIcon(canvas, size) {
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0b0b0b';
    ctx.fillRect(0, 0, size, size);
    const img = state.img;
    if (img) {
      const base = size / Math.min(img.naturalWidth, img.naturalHeight);
      const scale = base * state.zoom;
      const k = size / PREVIEW;
      const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
      ctx.drawImage(img, (size - w) / 2 + state.ox * k, (size - h) / 2 + state.oy * k, w, h);
    }
    const band = Math.round(size * 0.2);
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, size - band, size, band);
    const label = 'powered by NURVAN';
    let px = Math.round(band * 0.42);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 ' + px + 'px -apple-system, "Helvetica Neue", Arial, sans-serif';
    while (ctx.measureText(label).width > size * 0.9 && px > 6) { px -= 1; ctx.font = '700 ' + px + 'px -apple-system, "Helvetica Neue", Arial, sans-serif'; }
    ctx.fillStyle = '#d4af37';
    ctx.fillText(label, size / 2, size - band / 2);
  }

  function clampOffsets() {
    const img = state.img;
    if (!img) return;
    const scale = (PREVIEW / Math.min(img.naturalWidth, img.naturalHeight)) * state.zoom;
    const maxX = Math.max(0, (img.naturalWidth * scale - PREVIEW) / 2);
    const maxY = Math.max(0, (img.naturalHeight * scale - PREVIEW) / 2);
    state.ox = Math.max(-maxX, Math.min(maxX, state.ox));
    state.oy = Math.max(-maxY, Math.min(maxY, state.oy));
  }
  function paintPreview() {
    const c = document.getElementById('brand-canvas');
    if (c) drawIcon(c, PREVIEW);
  }

  function iconDataUrls() {
    const out = {};
    SIZES.forEach(function (size) {
      const c = document.createElement('canvas');
      drawIcon(c, size);
      out[size] = c.toDataURL('image/png');
    });
    return out;
  }

  function loadFile(file) {
    if (!file || !/^image\//.test(file.type || '')) { say('Scegli un’immagine (PNG o JPG).'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = function () {
      state.img = img; state.zoom = 1; state.ox = 0; state.oy = 0;
      say('');
      const z = document.getElementById('brand-zoom');
      if (z) z.value = '1';
      paintPreview();
      URL.revokeObjectURL(url);
    };
    img.onerror = function () { say('Scegli un’immagine (PNG o JPG).'); URL.revokeObjectURL(url); };
    img.src = url;
  }

  function say(message) {
    const el = document.getElementById('brand-msg');
    if (el) el.textContent = message ? T(message) : '';
  }

  function render(container) {
    const field = 'width:100%;margin-top:4px;padding:10px;background:#111;border:1px solid #333;color:#fff;border-radius:8px;font-size:16px;box-sizing:border-box;';
    container.innerHTML =
      '<div class="coach-os-page" id="coach-brand-page">' +
      '<div class="coach-os-page-header"><div><div class="coach-os-eyebrow">' + escText(T('Coach')) + '</div>' +
      '<h1 class="coach-os-title">' + escText(T('Il tuo marchio')) + '</h1>' +
      '<p class="coach-os-subtitle">' + escText(T('Nome e logo che vedono i tuoi clienti. Il link che mandi apre una web app con il tuo marchio e “powered by Nurvan”: l’icona che il cliente mette sulla Home è la tua.')) + '</p></div></div>' +
      '<div class="coach-os-card" style="padding:14px;">' +
      '<label style="font-size:10px;color:#ccc;font-weight:800;display:block;">' + escText(T('Nome (palestra o coach)')) +
      '<input id="brand-name" type="text" maxlength="40" placeholder="Fitness Gym X" value="' + escText(state.name) + '" style="' + field + '"></label>' +
      '<div style="font-size:10px;color:#ccc;font-weight:800;margin-top:14px;">' + escText(T('Logo')) + '</div>' +
      '<input id="brand-file" type="file" accept="image/*" style="display:none;">' +
      '<button type="button" class="btn btn-outline" style="width:100%;margin-top:6px;" onclick="document.getElementById(\'brand-file\').click()">' + escText(T('SCEGLI IL LOGO')) + '</button>' +
      (state.saved.hasLogo && !state.img ? '<p class="coach-os-subtitle" style="margin:8px 0 0;">' + escText(T('Hai già un logo salvato. Sceglierne un altro lo sostituisce.')) + '</p>' : '') +
      '<div id="brand-crop" style="display:' + (state.img ? 'block' : 'none') + ';margin-top:12px;text-align:center;">' +
      '<canvas id="brand-canvas" width="' + PREVIEW + '" height="' + PREVIEW + '" style="width:' + PREVIEW + 'px;height:' + PREVIEW + 'px;max-width:100%;border-radius:22%;border:1px solid #333;touch-action:none;cursor:grab;"></canvas>' +
      '<div style="font-size:11px;color:#aaa;margin-top:6px;">' + escText(T('Trascina per spostare, usa il cursore per ingrandire. Così appare l’icona sulla Home dei clienti.')) + '</div>' +
      '<input id="brand-zoom" type="range" min="1" max="4" step="0.02" value="' + state.zoom + '" aria-label="Zoom" style="width:80%;margin-top:8px;"></div>' +
      '<div id="brand-msg" style="font-size:12px;color:#ff8a80;min-height:16px;margin-top:10px;"></div>' +
      '<div style="display:grid;gap:8px;margin-top:6px;">' +
      '<button type="button" class="btn btn-primary" id="brand-save">' + escText(T('SALVA IL MARCHIO')) + '</button>' +
      ((state.saved.hasLogo || state.saved.name) ? '<button type="button" class="btn btn-outline" id="brand-remove" style="color:#c66;border-color:#c66;">' + escText(T('TOGLI IL MARCHIO')) + '</button>' : '') +
      '</div></div>' +
      '<p class="coach-os-subtitle" style="margin-top:12px;">' + escText(T('Nell’app degli store l’icona resta quella di Nurvan, uguale per tutti: il tuo logo compare in alto dentro l’app dei tuoi clienti e come icona della web app che aggiungono alla Home. Chi l’ha già aggiunta deve toglierla e aggiungerla di nuovo per vedere la nuova icona.')) + '</p>' +
      '</div>';
    const file = document.getElementById('brand-file');
    if (file) file.onchange = function () { loadFile(file.files && file.files[0]); };
    const name = document.getElementById('brand-name');
    if (name) name.oninput = function () { state.name = name.value; };
    const zoom = document.getElementById('brand-zoom');
    if (zoom) zoom.oninput = function () { state.zoom = Number(zoom.value) || 1; clampOffsets(); paintPreview(); };
    const canvas = document.getElementById('brand-canvas');
    if (canvas) {
      let drag = null;
      canvas.onpointerdown = function (ev) { drag = { x: ev.clientX, y: ev.clientY, ox: state.ox, oy: state.oy }; try { canvas.setPointerCapture(ev.pointerId); } catch (_) {} canvas.style.cursor = 'grabbing'; };
      canvas.onpointermove = function (ev) {
        if (!drag) return;
        const k = PREVIEW / canvas.getBoundingClientRect().width;
        state.ox = drag.ox + (ev.clientX - drag.x) * k;
        state.oy = drag.oy + (ev.clientY - drag.y) * k;
        clampOffsets(); paintPreview();
      };
      const end = function () { drag = null; canvas.style.cursor = 'grab'; };
      canvas.onpointerup = end; canvas.onpointercancel = end;
      paintPreview();
    }
    const save = document.getElementById('brand-save');
    if (save) save.onclick = CoachOS.saveBrand;
    const remove = document.getElementById('brand-remove');
    if (remove) remove.onclick = CoachOS.removeBrand;
  }

  CoachOS.saveBrand = async function () {
    if (state.busy) return;
    const nameEl = document.getElementById('brand-name');
    const name = nameEl ? String(nameEl.value || '').trim() : state.name;
    if (!name && !state.img) { say('Scrivi il nome o scegli il logo.'); return; }
    state.busy = true;
    const btn = document.getElementById('brand-save');
    if (btn) btn.disabled = true;
    try {
      const body = { name: name };
      if (state.img) body.icons = iconDataUrls();
      const data = await window.practiceFetch('/api/coach/branding', { method: 'PUT', headers: window.practiceHeaders(true), body: JSON.stringify(body) }, 40000);
      state.saved = { name: (data.branding && data.branding.name) || name, hasLogo: !!(data.branding && data.branding.hasLogo) };
      state.name = state.saved.name;
      state.img = null;
      if (typeof window.practiceToast === 'function') window.practiceToast(T('Marchio salvato'), 'success');
      const page = document.getElementById('coach-brand-page');
      if (page && page.parentNode) render(page.parentNode);
    } catch (error) {
      say((error && error.message) || 'Il marchio non è stato salvato. Riprova.');
      if (btn) btn.disabled = false;
    }
    state.busy = false;
  };

  CoachOS.removeBrand = async function () {
    if (!window.confirm(T('Togliere il marchio? I clienti rivedranno quello di Nurvan.'))) return;
    try {
      await window.practiceFetch('/api/coach/branding', { method: 'DELETE', headers: window.practiceHeaders(false) });
      state.saved = { name: '', hasLogo: false }; state.name = ''; state.img = null;
      if (typeof window.practiceToast === 'function') window.practiceToast(T('Marchio tolto'), 'success');
      const page = document.getElementById('coach-brand-page');
      if (page && page.parentNode) render(page.parentNode);
    } catch (error) {
      say((error && error.message) || 'Il marchio non è stato tolto. Riprova.');
    }
  };

  CoachOS.views.coachBrand = async function (container) {
    // Branding belongs to the Coach Pro plan (web/features.json).
    if (typeof planCan === 'function' && !planCan('branding')) {
      container.innerHTML = '<div class="coach-os-page">' + planLockedHtml('branding') + '</div>';
      return;
    }
    container.innerHTML = '<div class="coach-os-skeleton">' + escText(T('Carico…')) + '</div>';
    try {
      const data = await window.practiceFetch('/api/coach/branding', { headers: window.practiceHeaders(false) });
      const b = (data && data.branding) || {};
      state.saved = { name: b.name || '', hasLogo: !!b.hasLogo };
      if (!state.name) state.name = state.saved.name;
    } catch (_) {}
    if (typeof currentView === 'undefined' || currentView === 'coachBrand') render(container);
  };

  CoachOS.brandTestHooks = { drawIcon: drawIcon, state: state, SIZES: SIZES };
})();
