import fs from 'fs';

let web = fs.readFileSync('web/index.html', 'utf8');

const toastFunc = `
function showToast(message, type = 'info') {
  try {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:8px;max-width:90vw;pointer-events:none;';
      document.body.appendChild(toastContainer);
    }
    const toast = document.createElement('div');
    const bg = type === 'success' ? '#00e676' : type === 'danger' ? '#ff3b30' : '#d4af37';
    const color = '#000000';
    toast.style.cssText = 'background:' + bg + ';color:' + color + ';font-weight:700;font-size:12px;padding:10px 18px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.5);pointer-events:auto;opacity:0;transform:translateY(-10px);transition:all 0.3s cubic-bezier(0.16, 1, 0.3, 1);';
    toast.innerText = message;
    toastContainer.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  } catch (e) {
    console.log('[TOAST]', message);
  }
}
`;

if (!web.includes('function showToast(')) {
  web = web.replace('const esc = x =>', toastFunc + '\nconst esc = x =>');
  fs.writeFileSync('web/index.html', web, 'utf8');
  fs.writeFileSync('app/src/main/assets/index.html', web, 'utf8');
  console.log('Successfully injected showToast into web/index.html and app/src/main/assets/index.html');
} else {
  console.log('showToast already present');
}
