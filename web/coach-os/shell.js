(function () {
  'use strict';

  const CoachOS = window.CoachOS || { views: Object.create(null) };

  function enabled(name) {
    return typeof window.coachFeatureEnabled === 'function' && window.coachFeatureEnabled(name);
  }

  function escText(value) {
    if (typeof window.esc === 'function') return window.esc(String(value || ''));
    return String(value || '').replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function coachName() {
    const appStore = typeof store !== 'undefined' ? store : {};
    const prefs = appStore.coachPreferences || {};
    const account = appStore.accountUser || {};
    const explicit = String(prefs.businessName || '').trim();
    if (explicit) return explicit;
    const first = String(account.name || account.email || 'Nurvan').trim().split(/\s+/)[0];
    return first && first !== 'Nurvan' ? first + ' Coaching' : 'Nurvan Coaching';
  }

  function initials() {
    const account = (typeof store !== 'undefined' && store.accountUser) || {};
    const parts = String(account.name || account.email || 'NC').trim().split(/\s+/);
    return parts.slice(0, 2).map(function (part) { return part.charAt(0).toUpperCase(); }).join('') || 'NC';
  }

  function activePrimary(view) {
    if (view === 'coachToday') return 'coachToday';
    if (view === 'coachHub' || view === 'coachClient') return 'coachHub';
    if (view === 'coachInbox' || view === 'coachChat') return 'coachInbox';
    if (view === 'coachPrograms' || view === 'coachLibrary' || view === 'coachImport' || view === 'import') return 'coachPrograms';
    if (view === 'coachCalendar') return 'coachCalendar';
    return '';
  }

  function navTo(view, event) {
    if (event && event.preventDefault) event.preventDefault();
    if (typeof window.navigate === 'function') window.navigate(view, event);
    return false;
  }

  function ensureBrand() {
    const logo = document.querySelector('header .logo-container');
    if (!logo) return;
    let brand = document.getElementById('coach-os-header-brand');
    if (!brand) {
      brand = document.createElement('div');
      brand.id = 'coach-os-header-brand';
      brand.className = 'coach-os-brand';
      logo.appendChild(brand);
    }
    brand.innerHTML = '<strong>' + escText(coachName()) + '</strong><small>Coach mode</small>';
  }

  const primaryLinks = [
    { view: 'coachToday', label: 'Home' },
    { view: 'coachHub', label: 'Clients' },
    { view: 'coachInbox', label: 'Inbox' },
    { view: 'coachPrograms', label: 'Programs' },
    { view: 'coachCalendar', label: 'Calendar' }
  ];

  function secondaryLinks() {
    const rows = [
      { view: 'coachCheckIns', label: 'Check-ins', flag: 'checkInCenterV1' },
      { view: 'coachNutrition', label: 'Nutrition' },
      { view: 'coachFormReview', label: 'Form review', flag: 'videoFormV1' },
      { view: 'coachAnalytics', label: 'Analytics', flag: 'coachAnalyticsV1' },
      { view: 'coachAgent', label: 'Agent', flag: 'agentV1' },
      { view: 'coachAutomations', label: 'Automations', flag: 'businessV1' },
      { view: 'coachBusiness', label: 'Business', flag: 'businessV1' },
      { view: 'coachCrm', label: 'CRM', flag: 'businessV1' }
    ];
    return rows.filter(function (row) { return !row.flag || enabled(row.flag); });
  }

  function linkHtml(row, active) {
    return '<button type="button" class="coach-os-side-link' +
      (active === row.view ? ' active' : '') +
      '" onclick="CoachOS.navigate(\'' + row.view + '\')">' + escText(row.label) + '</button>';
  }

  function ensureSidebar() {
    let sidebar = document.getElementById('coach-os-sidebar');
    if (!sidebar) {
      sidebar = document.createElement('aside');
      sidebar.id = 'coach-os-sidebar';
      document.body.appendChild(sidebar);
    }
    const view = typeof currentView !== 'undefined' ? String(currentView || '') : '';
    const active = activePrimary(view) || view;
    sidebar.innerHTML =
      '<div class="coach-os-sidebar-brand"><img src="nurvan_logo.png" alt="Nurvan"><span>' +
      escText(coachName()) + '</span></div>' +
      '<nav class="coach-os-sidebar-nav">' +
      primaryLinks.map(function (row) { return linkHtml(row, active); }).join('') +
      '<div class="coach-os-card-kicker" style="padding:20px 12px 8px;">More</div>' +
      secondaryLinks().map(function (row) { return linkHtml(row, active); }).join('') +
      '</nav>' +
      '<div class="coach-os-sidebar-footer">' +
      '<button type="button" class="coach-os-side-link" onclick="CoachOS.openSettings()">Profile & Settings</button>' +
      '<button type="button" class="coach-os-side-link" onclick="CoachOS.openHelp()">Help</button>' +
      '<button type="button" class="coach-os-side-link" onclick="exitCoachSession()">Exit Coach</button>' +
      '</div>';
  }

  function mapBottomNav() {
    const ids = ['nav-home', 'nav-training', 'nav-stats', 'nav-ai', 'nav-db'];
    primaryLinks.forEach(function (row, index) {
      const element = document.getElementById(ids[index]);
      if (!element) return;
      element.style.display = '';
      const label = element.querySelector('span');
      if (label) label.textContent = row.label.toUpperCase();
      element.onclick = function (event) { return navTo(row.view, event); };
      element.classList.toggle('active', activePrimary(typeof currentView !== 'undefined' ? currentView : '') === row.view);
      element.setAttribute('aria-label', row.label);
    });
  }

  function applyShell(coachSession, athlete) {
    const useShell = !!(coachSession && !athlete && enabled('coachShellV2'));
    if (document.body) document.body.classList.toggle('coach-os-v2', useShell);
    const sidebar = document.getElementById('coach-os-sidebar');
    const brand = document.getElementById('coach-os-header-brand');
    if (!useShell) {
      if (sidebar && sidebar.parentNode) sidebar.parentNode.removeChild(sidebar);
      if (brand && brand.parentNode) brand.parentNode.removeChild(brand);
      return;
    }
    ensureBrand();
    ensureSidebar();
    mapBottomNav();
  }

  function headerControls(wrap, clients, curId) {
    if (!enabled('coachShellV2')) return false;
    wrap.className = 'coach-os-header-controls';
    wrap.style.cssText = '';
    const options = ['<option value="">Cliente…</option>'].concat((clients || []).map(function (client) {
      const id = String(client.id);
      return '<option value="' + escText(id) + '"' + (id === String(curId || '') ? ' selected' : '') + '>' +
        escText(client.displayName || client.username || ('#' + id)) + '</option>';
    }));
    const notificationCount = Math.max(0, Number((typeof store !== 'undefined' && store.__cpNotifyCount) || 0));
    wrap.innerHTML =
      '<select id="cp-client-switcher" class="coach-os-client-select" title="Cambia cliente" aria-label="Cambia cliente" onchange="switchCoachClientFromHeader(this.value)">' +
      options.join('') + '</select>' +
      '<button type="button" class="btn btn-outline coach-os-icon-btn" aria-label="Notifiche" title="Notifiche" onclick="openNotificationsCenter()">♢' +
      (notificationCount ? '<span class="cp-notify-count">' + (notificationCount > 99 ? '99+' : notificationCount) + '</span>' : '') +
      '</button>' +
      '<button type="button" class="btn btn-outline coach-os-icon-btn" aria-label="Menu Coach e profilo" title="Menu Coach" onclick="openCoachDrawer()">' +
      '<span style="font-size:10px;font-weight:900;">' + escText(initials()) + '</span></button>';
    return true;
  }

  function renderPlaceholder(container, title, body) {
    container.innerHTML =
      '<div class="coach-os-page">' +
      '<div class="coach-os-page-header"><div><div class="coach-os-eyebrow">Coach OS</div>' +
      '<h1 class="coach-os-title">' + escText(title) + '</h1>' +
      '<p class="coach-os-subtitle">' + escText(body || 'Questa sezione verrà attivata nella fase dedicata.') + '</p></div></div>' +
      '<div class="coach-os-empty">La struttura è pronta. I dati e le azioni compariranno quando la feature sarà abilitata.</div>' +
      '</div>';
  }

  function renderView(view, container) {
    if (!enabled('coachShellV2')) return false;
    const renderer = CoachOS.views[view];
    if (typeof renderer === 'function') {
      renderer(container);
      ensureSidebar();
      mapBottomNav();
      return true;
    }
    const placeholders = {
      coachInbox: ['Inbox', 'Messaggi, check-in, richieste e approvazioni'],
      coachCalendar: ['Calendar', 'Scheduling per coaching online'],
      coachCheckIns: ['Check-ins', 'Richiesti, ricevuti e da revisionare'],
      coachNutrition: ['Nutrition', 'Vista portfolio nutrizione'],
      coachFormReview: ['Form review', 'Video, marker e feedback esercizio'],
      coachAnalytics: ['Analytics', 'Adherence e performance dei clienti'],
      coachAgent: ['Nurvan Agent', 'Ask. Plan. Execute.'],
      coachAutomations: ['Automations', 'Trigger, condizioni e azioni'],
      coachBusiness: ['Business', 'Ledger e rinnovi'],
      coachCrm: ['CRM', 'Pipeline coaching leggera']
    };
    if (placeholders[view]) {
      renderPlaceholder(container, placeholders[view][0], placeholders[view][1]);
      ensureSidebar();
      mapBottomNav();
      return true;
    }
    return false;
  }

  function registerView(name, renderer) {
    CoachOS.views[name] = renderer;
  }

  function openSettings() {
    if (typeof window.exitCoachSession === 'function') window.exitCoachSession();
    setTimeout(function () {
      if (typeof window.navigate === 'function') window.navigate('settings');
    }, 0);
  }

  function openHelp() {
    if (typeof window.practiceToast === 'function') {
      window.practiceToast('Guida Coach OS: Today → Attention → Client → Decide → Execute', 'info');
    } else {
      alert('Today → Attention → Client → Understand → Decide → Nurvan executes');
    }
  }

  CoachOS.enabled = enabled;
  CoachOS.navigate = navTo;
  CoachOS.applyShell = applyShell;
  CoachOS.renderHeaderControls = headerControls;
  CoachOS.renderView = renderView;
  CoachOS.registerView = registerView;
  CoachOS.renderPlaceholder = renderPlaceholder;
  CoachOS.ensureSidebar = ensureSidebar;
  CoachOS.openSettings = openSettings;
  CoachOS.openHelp = openHelp;
  CoachOS.coachName = coachName;

  window.CoachOS = CoachOS;
})();
