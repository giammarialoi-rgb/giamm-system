import fs from 'fs';
import vm from 'vm';

const html = fs.readFileSync('web/index.html', 'utf8');
const scriptRegex = /<script(?![^>]*src=)>([\s\S]*?)<\/script>/gi;
let match;
let scriptContent = '';
while ((match = scriptRegex.exec(html)) !== null) {
  scriptContent += match[1] + '\n;\n';
}

const viewContainer = { innerHTML: '', style: {} };
const domMock = {
  window: {},
  document: {
    getElementById: (id) => {
      if (id === 'view-container') return viewContainer;
      return { innerHTML: '', style: {}, value: '', addEventListener: () => {} };
    },
    createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, click: () => {} }),
    body: { appendChild: () => {}, removeChild: () => {} }
  },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  navigator: { onLine: true },
  console: console
};
domMock.window = domMock;
const ctx = vm.createContext(domMock);
vm.runInContext(scriptContent, ctx);

console.log('DATA exists:', Boolean(ctx.DATA));
console.log('renderPrograms fn:', ctx.renderPrograms ? ctx.renderPrograms.toString().slice(0, 300) : 'undefined');
if (ctx.renderPrograms) {
  ctx.renderPrograms(viewContainer);
  console.log('viewContainer.innerHTML:', viewContainer.innerHTML.slice(0, 300));
}
