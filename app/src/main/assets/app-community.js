// Share Nurvan, rate it in the store, tell us about a problem or an idea: the three things the Google Play
// testers (Testers Community report, October 2026) found missing. Native where the app is native: the
// Android bridge (window.Android, MainActivity.java) and, on iPhone, the Capacitor plugins Share and
// InAppReview. The buttons are in Impostazioni › Nurvan ti piace? (renderCommunityCard in index.base.html).
(function (root) {
  'use strict';
  var DAY = 86400000;
  var IOS_APP_ID = '6817405788';
  // One address for everybody: the server sends an iPhone to the App Store, an Android phone to Google
  // Play and a computer to the site (/scarica in coach-api.mjs).
  var SHARE_URL = 'https://nurvan.app/scarica';
  var REVIEW_KEY = 'nurvan.review.v1';

  function tr(s) { return typeof root.tr === 'function' ? root.tr(s) : s; }
  function capacitorPlugin(name) {
    try { return (root.Capacitor && root.Capacitor.Plugins && root.Capacitor.Plugins[name]) || null; } catch (_) { return null; }
  }
  function platform() {
    try { if (root.Capacitor && typeof root.Capacitor.getPlatform === 'function' && root.Capacitor.getPlatform() === 'ios') return 'ios'; } catch (_) {}
    if (root.Android && typeof root.Android.getCoachApiUrl === 'function') return 'android';
    return 'web';
  }
  function bridge(method) {
    return platform() === 'android' && !!root.Android && typeof root.Android[method] === 'function';
  }
  function cancelled(err) {
    return !!err && (err.name === 'AbortError' || /cancel|annull|abort/i.test(String(err.message || err)));
  }

  /* ---------------- share ---------------- */

  function shareMessage() {
    return tr('Mi alleno con Nurvan: programma, alimentazione e progressi in un’unica app. Provala anche tu:') + ' ' + SHARE_URL;
  }

  // 'native' or 'web' when a share sheet opened, 'copied' when the message went to the clipboard (a
  // computer), 'cancelled', or 'manual' when it is shown to be copied by hand.
  async function share() {
    var text = shareMessage();
    var title = tr('Condividi Nurvan');
    try {
      if (bridge('shareText')) { root.Android.shareText(text, title); return 'native'; }
      var S = capacitorPlugin('Share');
      if (platform() === 'ios' && S && typeof S.share === 'function') { await S.share({ title: 'Nurvan', text: text, dialogTitle: title }); return 'native'; }
      if (root.navigator && typeof root.navigator.share === 'function') { await root.navigator.share({ title: 'Nurvan', text: text }); return 'web'; }
    } catch (err) {
      if (cancelled(err)) return 'cancelled';
    }
    try {
      await root.navigator.clipboard.writeText(text);
      return 'copied';
    } catch (_) {}
    return 'manual';
  }

  /* ---------------- rating ---------------- */

  function readReview() {
    try { return JSON.parse(root.localStorage.getItem(REVIEW_KEY) || '{}') || {}; } catch (_) { return {}; }
  }
  function writeReview(state) {
    try { root.localStorage.setItem(REVIEW_KEY, JSON.stringify(state)); } catch (_) {}
  }
  // The day this phone first opened a version that can ask for a rating: the "a few days of use" counts
  // from here.
  function noteFirstUse(now) {
    var state = readReview();
    if (!state.first) { state.first = now || Date.now(); writeReview(state); }
    return state;
  }

  // When the store's rating card may be asked for: right after a workout is closed, from the third workout
  // on, with the app in use for at least 3 days, at most 3 times and 120 days apart. The store still decides
  // whether it appears (Apple shows it at most 3 times a year, Google has its quota). Never with a question
  // of ours in front of it ("do you like Nurvan?"): both stores forbid filtering who gets to rate.
  function reviewDue(state, workouts, now) {
    state = state || {};
    if (!(Number(workouts) >= 3)) return false;
    if (!state.first || now - state.first < 3 * DAY) return false;
    if ((state.count || 0) >= 3) return false;
    if (state.last && now - state.last < 120 * DAY) return false;
    return true;
  }

  function afterWorkout(workouts) {
    if (platform() === 'web') return false;
    var now = Date.now();
    var state = noteFirstUse(now);
    if (!reviewDue(state, workouts, now)) return false;
    var asked = false;
    if (bridge('requestInAppReview')) { root.Android.requestInAppReview(); asked = true; }
    var R = capacitorPlugin('InAppReview');
    if (!asked && platform() === 'ios' && R && typeof R.requestReview === 'function') {
      Promise.resolve(R.requestReview()).catch(function () {});
      asked = true;
    }
    if (!asked) return false;
    state.count = (state.count || 0) + 1;
    state.last = now;
    writeReview(state);
    return true;
  }

  // The button opens the store page where the review is written. The in-app card is not meant for a button:
  // with its quota spent it would show nothing after the tap.
  function canRate() {
    return platform() === 'ios' || bridge('openStorePage');
  }
  function rate() {
    var state = readReview();
    state.last = Date.now();   // the card does not come right after someone who already went to rate
    writeReview(state);
    if (bridge('openStorePage')) { root.Android.openStorePage(); return true; }
    if (platform() === 'ios') {
      // An address outside the app is handed by Capacitor to iOS, which opens the App Store on "write a review".
      root.location.href = 'itms-apps://apps.apple.com/app/id' + IOS_APP_ID + '?action=write-review';
      return true;
    }
    return false;
  }

  /* ---------------- suggestions and problems ---------------- */

  function osOf(ua) {
    ua = String(ua || '');
    var m;
    if ((m = ua.match(/Android\s+([\d.]+)/))) return 'Android ' + m[1];
    if ((m = ua.match(/(?:iPhone|CPU) OS (\d+)[_.](\d+)/))) return 'iOS ' + m[1] + '.' + m[2];
    if (/iPad|Macintosh/.test(ua) && /Mobile/.test(ua)) return 'iPadOS';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Mac OS X/.test(ua)) return 'macOS';
    if (/Linux/.test(ua)) return 'Linux';
    return '';
  }
  function modelOf(ua) {
    ua = String(ua || '');
    var m = ua.match(/Android [\d.]+;\s*([^;)]+?)(?:\s+Build\/[^;)]*)?[;)]/);
    if (m && !/^(wv|K|Mobile)$/i.test(m[1].trim())) return m[1].trim();
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    return '';
  }

  // What a message carries besides its text when the box stays ticked: enough to reproduce a problem,
  // nothing that identifies the person or the phone.
  function deviceInfo(view) {
    var nav = root.navigator || {};
    var rel = root.NURVAN_RELEASE || {};
    var scr = root.screen || {};
    var lang = '';
    try { lang = (root.I18nService && root.I18nService.getLanguage && root.I18nService.getLanguage()) || ''; } catch (_) {}
    return {
      app: String(rel.versionName || ''),
      build: String(rel.webBuild || ''),
      platform: platform(),
      os: osOf(nav.userAgent),
      model: modelOf(nav.userAgent),
      screen: (scr.width && scr.height) ? scr.width + 'x' + scr.height : '',
      lang: String(lang || (nav.language || '')).slice(0, 5),
      view: String(view || '')
    };
  }

  function feedbackBody(kind, message, email, attach, view) {
    var body = { kind: String(kind || ''), message: String(message || '').trim(), email: String(email || '').trim() };
    if (attach) body.device = deviceInfo(view);
    return body;
  }

  var api = {
    platform: platform,
    shareMessage: shareMessage,
    share: share,
    reviewDue: reviewDue,
    noteFirstUse: noteFirstUse,
    afterWorkout: afterWorkout,
    canRate: canRate,
    rate: rate,
    osOf: osOf,
    modelOf: modelOf,
    deviceInfo: deviceInfo,
    feedbackBody: feedbackBody,
    SHARE_URL: SHARE_URL
  };
  root.NurvanCommunity = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
