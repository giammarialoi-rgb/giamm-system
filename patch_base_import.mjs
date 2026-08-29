import fs from 'fs';

let content = fs.readFileSync('web/index.base.html', 'utf8');

const oldCode = `const wb = (fileBufferOrText && fileBufferOrText.SheetNames) ? fileBufferOrText : xlsxLib.read(fileBufferOrText, { type: (fileBufferOrText instanceof ArrayBuffer || (typeof Buffer !== 'undefined' && Buffer.isBuffer(fileBufferOrText))) ? 'buffer' : 'binary' });`;

const newCode = `let readType = 'binary';
      if (typeof Buffer !== 'undefined' && Buffer.isBuffer(fileBufferOrText)) readType = 'buffer';
      else if (fileBufferOrText instanceof ArrayBuffer || (typeof ArrayBuffer !== 'undefined' && (fileBufferOrText instanceof Uint8Array || ArrayBuffer.isView(fileBufferOrText)))) readType = 'array';
      const wb = (fileBufferOrText && fileBufferOrText.SheetNames) ? fileBufferOrText : xlsxLib.read(fileBufferOrText, { type: readType });`;

content = content.replace(oldCode, newCode);

fs.writeFileSync('web/index.base.html', content, 'utf8');
console.log('Patched web/index.base.html ImportService.parseFile buffer reading');
