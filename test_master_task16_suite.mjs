  // -------------------------------------------------------------
  // FASE 13: BACKEND ERROR RESILIENCE (404, 500, 502, 503, TIMEOUT)
  // -------------------------------------------------------------
  console.log("\n[FASE 13] Backend Error Resilience & Fallback Tests...");

  const errorScenarios = [
    { code: 404, msg: 'Not Found' },
    { code: 500, msg: 'Internal Server Error' },
    { code: 502, msg: 'Bad Gateway' },
    { code: 503, msg: 'Service Unavailable' },
    { code: 'HTML_ERROR', msg: '<!DOCTYPE html><html><body>Error 502</body></html>' }
  ];