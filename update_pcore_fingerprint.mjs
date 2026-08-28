import fs from 'fs';

let pCore = fs.readFileSync('persistence-core.mjs', 'utf8');

const oldBlock = `    // 2. Compute canonical fingerprint pre-save
    const canonicalFingerprint = getDeterministicFingerprint(program);
    const programId = program.id || ('program_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));

    // 3. Construct persistent envelope
    const envelope = {
      id: programId,
      title: program.title || program.normalized_title || 'Programma Giammaria System',
      source: program.source || 'imported',
      canonicalVersion: program.canonicalVersion || "2.1",
      duration_weeks: (program.weeks || []).length,
      fingerprint: canonicalFingerprint,
      summary: preValidation.summary,
      updatedAt: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(program))
    };
    envelope.data.id = programId;`;

const newBlock = `    // 2. Ensure program ID is set consistently on program
    const programId = program.id || ('program_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7));
    program.id = programId;

    // 3. Compute canonical fingerprint pre-save
    const canonicalFingerprint = getDeterministicFingerprint(program);

    // 4. Construct persistent envelope
    const envelope = {
      id: programId,
      title: program.title || program.normalized_title || 'Programma Giammaria System',
      source: program.source || 'imported',
      canonicalVersion: program.canonicalVersion || "2.1",
      duration_weeks: (program.weeks || []).length,
      fingerprint: canonicalFingerprint,
      summary: preValidation.summary,
      updatedAt: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(program))
    };`;

if (!pCore.includes(oldBlock)) {
  console.error("oldBlock not found in persistence-core.mjs!");
  process.exit(1);
}

pCore = pCore.replace(oldBlock, newBlock);
fs.writeFileSync('persistence-core.mjs', pCore, 'utf8');
console.log("Updated persistence-core.mjs fingerprint calculation order!");
