#!/usr/bin/env node
// Puts on the clipboard the prompts of the next N exercises that still miss a pose (JSON), for the automation.
//   node tools/image_bench/batch.mjs [N] [FROM]
import { execFileSync } from 'node:child_process';
const N = Number(process.argv[2] || 8);
const d = await (await fetch('http://127.0.0.1:' + (process.env.PORT || 4777) + '/api/list')).json();
const FROM = Number(process.argv[3] || 0);   // absolute position in the list: lets several chats work on different ranges
const b = d.items.slice(FROM).filter((x) => !x.final && !x.imported).slice(0, N).map((x) => ({ file: x.file, start: x.start, end: x.end, prompts: x.prompts }));
execFileSync('powershell', ['-NoProfile', '-Command', '$input | Set-Clipboard'], { input: JSON.stringify(b) });
console.log('Copiati ' + b.length + ' esercizi: ' + b.map((x) => x.file).join(', '));
