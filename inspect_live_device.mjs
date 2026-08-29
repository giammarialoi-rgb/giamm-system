import WebSocket from 'ws';

async function main() {
  const listRes = await fetch('http://127.0.0.1:9222/json');
  const pages = await listRes.json();
  const page = pages.find(p => p.type === 'page');
  if (!page) {
    console.error('No page found');
    return;
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);

  await new Promise((resolve) => ws.on('open', resolve));

  let reqId = 1;
  function evaluate(expr) {
    return new Promise((resolve, reject) => {
      const id = reqId++;
      const handler = (data) => {
        const msg = JSON.parse(data);
        if (msg.id === id) {
          ws.off('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({
        id,
        method: 'Runtime.evaluate',
        params: {
          expression: expr,
          returnByValue: true,
          awaitPromise: true
        }
      }));
    });
  }

  console.log('=== INSPECTING LIVE DEVICE WEBVIEW ===');

  const loc = await evaluate('window.location.href');
  console.log('Location:', loc.result.value);

  const title = await evaluate('document.title');
  console.log('Title:', title.result.value);

  const viewContainerHtml = await evaluate('document.getElementById("view-container") ? document.getElementById("view-container").innerHTML : "NO VIEW CONTAINER"');
  console.log('view-container innerHTML:\n', viewContainerHtml.result.value.substring(0, 500));

  const splashDisplay = await evaluate('document.getElementById("splash") ? document.getElementById("splash").style.display : "NO SPLASH"');
  console.log('splash style.display:', splashDisplay.result.value);

  const splashOpacity = await evaluate('document.getElementById("splash") ? document.getElementById("splash").style.opacity : "NO SPLASH"');
  console.log('splash style.opacity:', splashOpacity.result.value);

  const dataVal = await evaluate('typeof DATA !== "undefined" ? (DATA ? { title: DATA.title, weeksCount: (DATA.weeks||[]).length } : "DATA is null") : "DATA is undefined"');
  console.log('DATA:', dataVal.result.value);

  const storeVal = await evaluate('typeof store !== "undefined" ? { activeProgram: !!store.activeProgram, activeProgramId: store.activeProgramId, docsCount: (store.docs||[]).length } : "store is undefined"');
  console.log('store:', storeVal.result.value);

  const idbVal = await evaluate('typeof GiammariaPersistence !== "undefined" ? "Persistence Available" : "Persistence MISSING"');
  console.log('Persistence Singleton:', idbVal.result.value);

  const activeProgIdb = await evaluate(`
    (async () => {
      if (typeof GiammariaPersistence !== 'undefined') {
        try {
          const prog = await GiammariaPersistence.loadActiveProgram();
          return prog ? { id: prog.id, title: prog.title, weeksCount: (prog.weeks||[]).length } : 'No active program in IDB';
        } catch(e) {
          return 'IDB Error: ' + e.message;
        }
      }
      return 'Persistence not defined';
    })()
  `);
  console.log('IDB Active Program:', activeProgIdb.result.value);

  const allProgsIdb = await evaluate(`
    (async () => {
      if (typeof GiammariaPersistence !== 'undefined') {
        try {
          const progs = await GiammariaPersistence.getAllPrograms();
          return progs.map(p => ({ id: p.id, title: p.title, weeks: (p.weeks||[]).length }));
        } catch(e) {
          return 'IDB GetAll Error: ' + e.message;
        }
      }
      return 'Persistence not defined';
    })()
  `);
  console.log('IDB All Programs:', JSON.stringify(allProgsIdb.result.value));

  const lsSize = await evaluate('localStorage.getItem("GS_STORE") ? localStorage.getItem("GS_STORE").length : 0');
  console.log('localStorage GS_STORE length (chars):', lsSize.result.value);

  ws.close();
}

main().catch(console.error);
