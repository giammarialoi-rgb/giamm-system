import { evaluate } from './test-coach-hardening.mjs';

async function main() {
  const info = await evaluate(`
    (() => {
      return {
        url: window.location.href,
        hasStore: typeof window.store !== 'undefined',
        hasDATA: typeof window.DATA !== 'undefined',
        bodyText: document.body.innerText.substring(0, 300),
        scriptsCount: document.querySelectorAll('script').length
      };
    })()
  `);
  console.log('APP INFO:', info);
}

main().catch(console.error);
