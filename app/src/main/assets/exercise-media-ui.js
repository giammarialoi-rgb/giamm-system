// Shared media panel for exercise info and warm-up player.
// Renders a fixed-size visual slot that is present whether or not media
// exists: the placeholder is the base layer and a master image, when there
// is one, is painted on top of it. An image that fails to load hides itself
// and reveals the placeholder again, so a broken URL degrades to the same
// stable state as no media at all.
(function (global) {
  'use strict';

  function escapeAttr(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  var SLOT = 'position:relative;width:100%;aspect-ratio:1/1;max-height:42vh;'
    + 'border-radius:14px;overflow:hidden;background:#121212;'
    + 'border:1px solid #2e2e2e;margin:0 0 16px;box-sizing:border-box;';

  var PLACEHOLDER = 'position:absolute;inset:0;display:flex;flex-direction:column;'
    + 'align-items:center;justify-content:center;gap:10px;text-align:center;padding:16px;'
    + 'box-sizing:border-box;';

  var MARK = 'font-size:72px;line-height:1;font-weight:900;color:#4a4a4a;';

  var CAPTION = 'font-size:11px;letter-spacing:1.2px;font-weight:800;color:#6d6d6d;';

  var IMG = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;'
    + 'background:#121212;';

  // manifest is the shape returned by NurvanExerciseMedia.resolve(): it may be
  // null, or { hasMedia, media: { master } }. Anything unusable falls through
  // to the placeholder rather than throwing.
  function mediaPanel(manifest, altText) {
    var master = null;
    if (manifest && manifest.hasMedia && manifest.media && manifest.media.master) {
      master = manifest.media.master;
    }

    var html = '<div style="' + SLOT + '" data-nurvan-media-slot="1">'
      + '<div style="' + PLACEHOLDER + '" data-nurvan-media-placeholder="1">'
      + '<div style="' + MARK + '">?</div>'
      + '<div style="' + CAPTION + '">IMMAGINE NON DISPONIBILE</div>'
      + '</div>';

    if (master) {
      // Deliberately not loading="lazy": this image is absolutely positioned
      // inside a container created in the same tick, and the lazy heuristic
      // never decides it is in view, so the request is simply never made. The
      // master is already only fetched when the sheet opens, so there is
      // nothing left to defer.
      html += '<img src="' + escapeAttr(master) + '"'
        + ' alt="' + escapeAttr(altText || '') + '"'
        + ' decoding="async"'
        + ' data-nurvan-media-image="1"'
        + ' style="' + IMG + '"'
        + ' onerror="this.style.display=\'none\'">';
    }

    return html + '</div>';
  }

  // Resolves media for one entity and hands the manifest back. Never rejects:
  // a failed lookup resolves to null so the caller renders the placeholder.
  function loadMedia(entityType, entityId, canonicalName) {
    var api = global.NurvanExerciseMedia;
    if (!api || typeof api.resolve !== 'function' || !entityId) {
      return Promise.resolve(null);
    }
    try {
      return Promise.resolve(api.resolve(entityType, entityId, { canonicalName: canonicalName || null }))
        .catch(function () { return null; });
    } catch (err) {
      return Promise.resolve(null);
    }
  }

  function exerciseIdFor(name) {
    var api = global.NurvanExerciseMedia;
    if (api && typeof api.canonicalExerciseId === 'function') {
      return api.canonicalExerciseId(name);
    }
    return null;
  }

  // Chrome for the full-height sheets (exercise info, warm-up player). Kept in
  // a stylesheet rather than inline styles because the phone and desktop cases
  // genuinely differ: a phone gets an edge-to-edge sheet that has to clear the
  // status bar, a wide screen gets a centred panel that should not.
  var CSS = [
    '.nurvan-sheet{position:fixed;inset:0;z-index:10150;background:#0a0a0a;',
    'display:none;align-items:stretch;justify-content:center;box-sizing:border-box;}',
    '.nurvan-sheet.is-open{display:flex;}',
    '.nurvan-sheet-panel{position:relative;display:flex;flex-direction:column;',
    'width:100%;height:100%;background:#0d0d0d;color:#eee;box-sizing:border-box;',
    'overflow:hidden;}',
    '.nurvan-sheet-head{flex:0 0 auto;display:flex;align-items:center;',
    'justify-content:space-between;gap:12px;background:#0d0d0d;',
    'border-bottom:1px solid #242424;box-sizing:border-box;',
    'padding:14px 16px;padding-top:calc(14px + env(safe-area-inset-top,0px));}',
    '.nurvan-sheet-body{flex:1 1 auto;overflow-y:auto;-webkit-overflow-scrolling:touch;',
    'padding:16px;box-sizing:border-box;}',
    '.nurvan-sheet-foot{flex:0 0 auto;display:flex;gap:8px;background:#0d0d0d;',
    'border-top:1px solid #242424;box-sizing:border-box;',
    'padding:12px 16px;padding-bottom:calc(12px + env(safe-area-inset-bottom,0px));}',
    '@media (min-width:768px){',
    '.nurvan-sheet{align-items:center;padding:24px;background:rgba(0,0,0,.88);}',
    '.nurvan-sheet-panel{width:100%;max-width:600px;height:auto;max-height:88vh;',
    'border:1px solid var(--gold,#d4af37);border-radius:16px;}',
    '.nurvan-sheet-head{padding-top:14px;border-radius:16px 16px 0 0;}',
    '.nurvan-sheet-foot{padding-bottom:12px;border-radius:0 0 16px 16px;}}'
  ].join('');

  function injectStyles() {
    if (!global.document || document.getElementById('nurvan-media-ui-css')) return;
    var tag = document.createElement('style');
    tag.id = 'nurvan-media-ui-css';
    tag.textContent = CSS;
    (document.head || document.documentElement).appendChild(tag);
  }

  if (global.document) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectStyles);
    } else {
      injectStyles();
    }
  }

  global.NurvanMediaUI = {
    mediaPanel: mediaPanel,
    loadMedia: loadMedia,
    exerciseIdFor: exerciseIdFor,
    injectStyles: injectStyles
  };
})(typeof window !== 'undefined' ? window : this);
