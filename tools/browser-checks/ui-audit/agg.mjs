import fs from 'node:fs'; const dir=process.argv[2];
const count=new Map(); const per={};
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.json'))){ const j=JSON.parse(fs.readFileSync(dir+'/'+f)); per[j.view]=j; for(const i of j.issues||[]){ const key=i.k+' | '+(i.el||i.a+' <> '+i.b); if(!count.has(key)) count.set(key,[]); count.get(key).push(j.view+(i.w!==undefined?'':'')); } }
const kinds={}; for(const [k,v] of count){ const kind=k.split(' | ')[0]; (kinds[kind]=kinds[kind]||[]).push([k,v]); }
for(const [kind,list] of Object.entries(kinds)){ console.log('\n=== '+kind+' ('+list.length+' unique)'); for(const [k,v] of list.sort((a,b)=>b[1].length-a[1].length).slice(0,+process.argv[3]||25)) console.log(v.length+'x '+k.slice(kind.length+3).slice(0,150)+'  ['+[...new Set(v)].slice(0,4).join(',')+']'); }
