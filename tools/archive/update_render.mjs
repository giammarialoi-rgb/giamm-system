import fs from 'fs';

let baseHtml = fs.readFileSync('web/index.base.html', 'utf8');

const oldRenderBlock = `function render() {
  ensureStoreIntegrity();
  const c = $('view-container');
  if (!c) return;

  if (!DATA) {
    c.innerHTML = \`
      <div class="card" style="padding:20px;text-align:center;">
        <div style="font-size:16px;font-weight:900;color:var(--gold);margin-bottom:8px;">Caricamento Iniziale</div>
        <p style="font-size:12px;color:#aaa;margin-bottom:15px;">Inizializzazione dei moduli di sistema in corso...</p>
        <button class="btn btn-outline" onclick="init()">RIPROVA CARICAMENTO</button>
      </div>
    \`;
    return;
  }`;

const newRenderBlock = `function render() {
  ensureStoreIntegrity();
  const c = $('view-container');
  if (!c) return;

  if (currentView === 'import') {
    c.innerHTML = '';
    renderImport(c);
    return;
  }
  if (currentView === 'db') {
    c.innerHTML = '';
    renderDb(c);
    return;
  }
  if (currentView === 'ai') {
    c.innerHTML = '';
    renderAI(c);
    return;
  }

  if (!DATA) {
    c.innerHTML = \`
      <div class="card" style="padding:20px;text-align:center;">
        <div style="font-size:16px;font-weight:900;color:var(--gold);margin-bottom:8px;">Caricamento Iniziale</div>
        <p style="font-size:12px;color:#aaa;margin-bottom:15px;">Inizializzazione dei moduli di sistema in corso...</p>
        <button class="btn btn-outline" onclick="init()">RIPROVA CARICAMENTO</button>
      </div>
    \`;
    return;
  }`;

if (baseHtml.includes(oldRenderBlock)) {
  baseHtml = baseHtml.replace(oldRenderBlock, newRenderBlock);
  fs.writeFileSync('web/index.base.html', baseHtml, 'utf8');
  console.log('✓ Updated render() in web/index.base.html');
} else {
  console.error('Could not find oldRenderBlock');
}
