import fs from 'fs';

let baseHtml = fs.readFileSync('web/index.base.html', 'utf8');

const oldErrFunc = `function displayCoachAiFileError(name, errorMsg) {
  const h = $('chat-history');
  if (!h) return;
  const msg = \`
### ⚠️ IMPOSSIBILE LEGGERE IL FILE

- **File**: \${esc(name || 'documento')}
- **Problema rilevato**: \${esc(errorMsg || 'Errore di lettura o formato non supportato')}

---

**Suggerimenti:**
1. Assicurati che il file sia in formato **.xlsx, .xls, .pdf, .docx, .txt** o **.csv**.
2. Verifica che il file non sia protetto da password o danneggiato.
3. Puoi anche incollare il testo della scheda direttamente nella sezione [Universal Import].
  \`;
  store.chatHistory.push({ role: 'assistant', text: msg });
  persist();
  if (typeof render === 'function') render();
}`;

const newErrFunc = `function displayCoachAiFileError(name, errorMsg) {
  const msg = \`
### ⚠️ IMPOSSIBILE LEGGERE IL FILE

- **File**: \${esc(name || 'documento')}
- **Problema rilevato**: \${esc(errorMsg || 'Errore di lettura o formato non supportato')}

---

**Suggerimenti:**
1. Assicurati che il file sia in formato **.xlsx, .xls, .pdf, .docx, .txt** o **.csv**.
2. Verifica che il file non sia protetto da password o danneggiato.
3. Puoi anche incollare il testo della scheda direttamente nella sezione [Universal Import].
  \`;
  if (!store.chatHistory) store.chatHistory = [];
  store.chatHistory.push({ role: 'assistant', text: msg });
  persist();
  if (typeof render === 'function') render();
}`;

if (baseHtml.includes(oldErrFunc)) {
  baseHtml = baseHtml.replace(oldErrFunc, newErrFunc);
  fs.writeFileSync('web/index.base.html', baseHtml, 'utf8');
  console.log('✓ Updated displayCoachAiFileError in web/index.base.html');
} else {
  console.log('displayCoachAiFileError not exact match, searching...');
}
