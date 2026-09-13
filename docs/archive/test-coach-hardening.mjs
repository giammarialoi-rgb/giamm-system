let nextId = 1;

async function getWebSocketUrl() {
  const res = await fetch('http://localhost:9222/json');
  const pages = await res.json();
  const page = pages.find(p => p.type === 'page' && p.url.includes('index.html')) || pages[0];
  return page.webSocketDebuggerUrl;
}

export async function evaluate(expression) {
  const wsUrl = await getWebSocketUrl();
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: nextId++,
        method: 'Runtime.evaluate',
        params: {
          expression: expression,
          returnByValue: true,
          awaitPromise: true
        }
      }));
    };
    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.error) {
        reject(data.error);
      } else if (data.result) {
        if (data.result.exceptionDetails) {
          reject(data.result.exceptionDetails);
        } else {
          resolve(data.result.result?.value);
        }
      }
      ws.close();
    };
    ws.onerror = (err) => reject(err);
  });
}

export async function askCoach(question) {
  return await evaluate(`
    (async () => {
      const input = document.getElementById('ai-input');
      if (input) input.value = ${JSON.stringify(question)};
      const beforeLen = (store && store.chatHistory) ? store.chatHistory.length : 0;
      await askAI();
      const afterLen = (store && store.chatHistory) ? store.chatHistory.length : 0;
      const lastReply = (store && store.chatHistory && store.chatHistory.length) ? store.chatHistory[store.chatHistory.length - 1] : null;
      const proposals = window.activeCoachProposals || {};
      const propKeys = Object.keys(proposals);
      const latestPropKey = propKeys.length ? propKeys[propKeys.length - 1] : null;
      const latestProp = latestPropKey ? proposals[latestPropKey] : null;

      // Extract card HTML if rendered
      const cardEl = latestPropKey ? document.getElementById('card-' + latestPropKey) : null;
      const cardHtml = cardEl ? cardEl.innerText : null;

      return {
        question: ${JSON.stringify(question)},
        reply: lastReply,
        proposalId: latestPropKey,
        proposal: latestProp,
        cardPreviewText: cardHtml,
        currentWeek: typeof currentWeek !== 'undefined' ? currentWeek : null,
        currentDay: typeof currentDay !== 'undefined' ? currentDay : null
      };
    })()
  `);
}

export async function applyProposal(propId) {
  return await evaluate(`
    (async () => {
      await applyCoachProposal(${JSON.stringify(propId)});
      return {
        programWeeks: DATA ? DATA.weeks.length : 0,
        currentWeek: typeof currentWeek !== 'undefined' ? currentWeek : null,
        lastAudit: store && store.auditLog && store.auditLog.length ? store.auditLog[store.auditLog.length - 1] : null
      };
    })()
  `);
}

export async function initAppAndLoadProgram() {
  return await evaluate(`
    (async () => {
      if (typeof switchTab === 'function') switchTab('coach');
      return {
        hasData: typeof DATA !== 'undefined' && DATA !== null,
        weeksCount: DATA && DATA.weeks ? DATA.weeks.length : 0,
        tab: typeof currentTab !== 'undefined' ? currentTab : null,
        auditLogCount: store && store.auditLog ? store.auditLog.length : 0
      };
    })()
  `);
}
