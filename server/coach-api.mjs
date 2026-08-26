import http from 'node:http';
import { GoogleGenAI } from '@google/genai';
import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';
import XLSX from 'xlsx';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const port = Number(process.env.PORT || 8787);
const apiKey = process.env.GEMINI_API_KEY;
const mockGemini = Boolean(process.env.MOCK_GEMINI && process.env.MOCK_GEMINI !== '0');
const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const maxBytes = 16 * 1024 * 1024;
const geminiClient = apiKey ? new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1alpha' } }) : null;

if (!apiKey && !mockGemini) throw new Error('GEMINI_API_KEY must be set on the server or enable MOCK_GEMINI=1 for local testing.');
console.info(`GEMINI_API_KEY configured: ${Boolean(apiKey)}`);
console.info(`MODEL = ${model}`);

const setSchema = {
  type: 'object',
  properties: {
    order: { type: 'integer' },
    reps: { type: ['string', 'null'] },
    load: { type: ['number', 'null'] },
    load_unit: { type: ['string', 'null'] },
    percentage_1rm: { type: ['number', 'null'] },
    rpe: { type: ['number', 'null'] },
    rir: { type: ['number', 'null'] },
    rest_seconds: { type: ['integer', 'null'] },
    tempo: { type: ['string', 'null'] },
    done: { type: ['boolean', 'null'] }
  }
};

const exerciseSchema = {
  type: 'object',
  required: ['name', 'order'],
  properties: {
    name: { type: 'string' },
    order: { type: 'integer' },
    movement: { type: ['string', 'null'] },
    is_bonus: { type: ['boolean', 'null'] },
    muscle_group: { type: ['string', 'null'] },
    muscle_groups: { type: 'array', items: { type: 'string' } },
    superset_id: { type: ['string', 'null'] },
    sets: { type: ['integer', 'null'] },
    sets_data: { type: 'array', items: setSchema },
    reps: { type: ['string', 'null'] },
    load: { type: ['number', 'null'] },
    load_unit: { type: ['string', 'null'] },
    percentage_1rm: { type: ['number', 'null'] },
    rpe: { type: ['number', 'null'] },
    rir: { type: ['number', 'null'] },
    rest_seconds: { type: ['integer', 'null'] },
    tempo: { type: ['string', 'null'] },
    notes: { type: ['string', 'null'] },
    progression_rule: { type: ['string', 'null'] }
  }
};

const sessionSchema = {
  type: 'object',
  required: ['day', 'title', 'exercises'],
  properties: {
    day: { type: 'string' },
    title: { type: 'string' },
    is_bonus: { type: ['boolean', 'null'] },
    exercises: { type: 'array', items: exerciseSchema }
  }
};

const weekSchema = {
  type: 'object',
  required: ['week', 'label', 'sessions'],
  properties: {
    week: { type: 'integer' },
    label: { type: 'string' },
    sessions: { type: 'array', items: sessionSchema }
  }
};

const programSchema = {
  type: 'object',
  required: ['weeks'],
  properties: {
    title: { type: 'string' },
    source_summary: { type: 'string' },
    assumptions: { type: 'array', items: { type: 'string' } },
    global_rules: { type: 'array', items: { type: 'string' } },
    warnings: { type: 'array', items: { type: 'string' } },
    weeks: { type: 'array', items: weekSchema }
  }
};

const analysisSchema = programSchema;

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const contentType = String(req.headers['content-type'] || '');
    if (contentType.startsWith('multipart/form-data')) {
      const m = contentType.match(/boundary=(?:\"?)([^;\"]+)/i);
      if (!m) return reject(new Error('Missing multipart boundary'));
      const boundary = '--' + m[1];
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (buf.length > maxBytes) return reject(new Error('Payload too large'));
        const text = buf.toString('binary');
        const parts = text.split(boundary).slice(1, -1);
        const fields = {};
        let fileObj = null;
        for (const part of parts) {
          const [rawHeaders, ...rest] = part.split('\r\n\r\n');
          if (!rawHeaders) continue;
          const bodyPart = rest.join('\r\n\r\n').replace(/\r\n$/,'');
          const headerLines = rawHeaders.split('\r\n').map(l => l.trim()).filter(Boolean);
          const cd = headerLines.find(l => l.toLowerCase().startsWith('content-disposition'));
          if (!cd) continue;
          const nameMatch = cd.match(/name=\"([^\"]+)\"/i);
          const filenameMatch = cd.match(/filename=\"([^\"]+)\"/i);
          if (filenameMatch) {
            const filename = filenameMatch[1];
            const contentTypeLine = headerLines.find(l => l.toLowerCase().startsWith('content-type')) || '';
            const mimeType = (contentTypeLine.split(':')[1] || '').trim();
            const bodyBuf = Buffer.from(bodyPart, 'binary');
            fileObj = { filename, mimeType, dataBase64: bodyBuf.toString('base64') };
          } else if (nameMatch) {
            const name = nameMatch[1];
            fields[name] = Buffer.from(bodyPart, 'binary').toString('utf8');
          }
        }
        if (fileObj) resolve({ file: fileObj, ...fields });
        else if (fields.text) resolve({ text: fields.text, ...fields });
        else resolve(fields);
      });
      req.on('error', reject);
      return;
    }
    if (contentType.includes('application/json')) {
      let size = 0; const chunks = [];
      req.on('data', chunk => { size += chunk.length; if (size > maxBytes) { reject(new Error('Payload too large')); req.destroy(); } else chunks.push(chunk); });
      req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new Error('Invalid JSON')); } });
      req.on('error', reject);
      return;
    }
    let size = 0; const chunks = [];
    req.on('data', chunk => { size += chunk.length; if (size > maxBytes) { reject(new Error('Payload too large')); req.destroy(); } else chunks.push(chunk); });
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = Object.fromEntries(new URLSearchParams(text));
        resolve(params);
      } else resolve({ text });
    });
    req.on('error', reject);
  });
}

async function gemini(payload) {
  if (mockGemini) {
    const mockOutput = payload.response_format
      ? JSON.stringify({
          title: 'Mock program',
          source_summary: 'Mock source',
          assumptions: [],
          global_rules: [],
          warnings: [],
          weeks: [{
            week: 1,
            label: 'Mock week',
            sessions: [{ day: 'Day 1', title: 'Mock session', is_bonus: false, exercises: [{
                name: 'Mock exercise',
                order: 1,
                movement: 'PETTO',
                is_bonus: false,
                muscle_group: 'PETTO',
                muscle_groups: ['PETTO', 'TRICIPITI'],
                sets: 3,
                reps: '10',
                load: null,
                load_unit: 'kg',
                percentage_1rm: null,
                rpe: null,
                rir: 2,
                rest_seconds: 90,
                tempo: '',
                notes: '',
                progression_rule: ''
            }] }]
          }]
        })
      : 'Risposta mock del coach.';
    return { output_text: mockOutput };
  }
  try {
    console.info('Gemini request', { model, inputType: Array.isArray(payload.input) ? 'multimodal' : 'text' });
    return await geminiClient.interactions.create({ model, store: false, ...payload }, { timeout_ms: 90000 });
  } catch (error) {
    const status = error?.status || error?.statusCode || error?.response?.status;
    console.error('Gemini error', {
      name: error?.name,
      status,
      message: error?.message,
      response: error?.response,
      details: error?.details,
      stack: error?.stack
    });
    const wrapped = new Error(`Gemini request failed: ${error?.message || 'unknown SDK error'}`);
    wrapped.name = error?.name || 'GeminiError';
    wrapped.status = status;
    wrapped.details = error?.details;
    wrapped.isGemini = true;
    throw wrapped;
  }
}

function outputText(result) {
  return typeof result?.output_text === 'string' ? result.output_text : '';
}

export function parseDocStructureIntermediate(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    return { sessions: [], sourceSessionCount: 0, sourceExerciseCount: 0 };
  }
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const sessions = [];
  let currentSession = null;
  let totalExercises = 0;

  const sessionHeaderRegex = /^(?:SESSIONE|GIORNO|DAY|ALLENAMENTO|FOGLIO|WORKOUT)\s*([0-9A-Za-z\s\-\.\–\—\:]+)/i;
  const bonusRegex = /(?:bonus|richiamo|extra|opzional)/i;

  for (const line of lines) {
    if (sessionHeaderRegex.test(line) || /^(?:UPPER|LOWER|FULL\s*BODY|PUSH|PULL|LEGS)/i.test(line)) {
      const isBonus = bonusRegex.test(line);
      currentSession = {
        title: line,
        is_bonus: isBonus,
        exercises: []
      };
      sessions.push(currentSession);
      continue;
    }

    if (!currentSession) {
      currentSession = {
        title: 'SESSIONE 1',
        is_bonus: false,
        exercises: []
      };
      sessions.push(currentSession);
    }

    if (/(?:x|\d+\s*(?:serie|sets|reps|rip|kg|rpe|rir))/i.test(line) ||
        /^(?:[0-9]+[\.\)\-]?|\*|\-|\•)\s+[A-Za-z]/i.test(line) ||
        /riga\s+\d+:/i.test(line)) {
      currentSession.exercises.push(line);
      totalExercises++;
    }
  }

  const finalSessions = sessions.filter(s => s.exercises.length > 0);
  const sessionCount = Math.max(1, finalSessions.length);
  const exerciseCount = Math.max(sessionCount, totalExercises);

  console.info(`DOC_STRUCT_SOURCE_SESSIONS=${sessionCount}`);
  console.info(`DOC_STRUCT_SOURCE_EXERCISES=${exerciseCount}`);

  return {
    sessions: finalSessions,
    sourceSessionCount: sessionCount,
    sourceExerciseCount: exerciseCount
  };
}

function countSourceExerciseLines(text) {
  const parsed = parseDocStructureIntermediate(text);
  return parsed.sourceExerciseCount;
}

async function extractLegacyWordText(buffer) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'giammaria-doc-'));
  const filename = path.join(dir, 'document.doc');
  try {
    await fs.writeFile(filename, buffer);
    const document = await new WordExtractor().extract(filename);
    return [document.getBody(), document.getHeaders(), document.getFootnotes()].filter(Boolean).join('\n\n');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function extractExcelText(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, cellNF: true, cellFormula: true });
  if (!workbook.SheetNames.length) throw new Error('Excel workbook contains no worksheets');
  return workbook.SheetNames.map((name, index) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: false, defval: '', blankrows: true });
    return [`FOGLIO ${index + 1}: ${name}`, ...rows.map((row, rowIndex) => `RIGA ${rowIndex + 1}: ${row.map(value => value == null ? '' : String(value)).join(' | ')}`)].join('\n');
  }).join('\n\n');
}

function validateFile({ filename, mimeType, dataBase64 }) {
  if (!filename || !dataBase64) throw new Error('File missing');
  if (!/\.(pdf|doc|docx|txt|xlsx|xls)$/i.test(filename)) throw new Error('Only PDF, DOC, DOCX, TXT, XLSX and XLS files are supported');
  const bytes = Buffer.from(dataBase64, 'base64');
  if (!bytes.length || bytes.length > 12 * 1024 * 1024) throw new Error('File must be between 1 byte and 12 MB');
  const extension = filename.toLowerCase().split('.').pop();
  return {
    filename,
    extension,
    bytes,
    data: dataBase64,
    mime_type: mimeType || (extension === 'pdf' ? 'application/pdf' : extension === 'txt' ? 'text/plain' : 'application/octet-stream')
  };
}

async function analyze(body) {
  const prompt = `Extract the workout plan faithfully and exhaustively.
Return ONLY JSON matching the supplied schema, with weeks[].sessions[].exercises[].
REGOLE FONDAMENTALI:
1. Non inventare esercizi, serie, ripetizioni, carichi, RPE, RIR, recuperi o progressioni.
2. ESTRAZIONE COMPLETA: Se una sessione contiene 9 esercizi (o qualsiasi numero di esercizi), DEVI estrarre TUTTI i 9 esercizi nell'array exercises. Non troncare o riassumere.
3. SESSIONI/ESERCIZI BONUS: Se nel documento sono presenti giorni o esercizi contrassegnati come BONUS, richiamo o opzionali, impostali con is_bonus: true.
4. GRUPPI MUSCOLARI: Valorizza muscle_group e muscle_groups per ogni esercizio.
Preserve every exercise, session, set count, reps, rest and intensity exactly as written; use null when absent.`;

  let result;
  let rawSourceText = '';
  if (body?.file || body?.filename || body?.data_base64) {
    const fileObj = body.file || { filename: body.filename, mimeType: body.mime_type, dataBase64: body.data_base64 };
    const document = validateFile(fileObj);
    console.info('Analyze input', { filename: document.filename, extension: document.extension, bytes: document.bytes.length, mimeType: document.mime_type });
    let input;
    if (document.extension === 'pdf') {
      input = [{ type: 'text', text: prompt }, { type: 'document', data: document.data, mime_type: 'application/pdf' }];
    } else if (document.extension === 'docx') {
      const extracted = await mammoth.extractRawText({ buffer: document.bytes });
      rawSourceText = extracted.value || '';
      input = [{ type: 'text', text: `${prompt}\n\nDocument text:\n${rawSourceText}` }];
    } else if (document.extension === 'doc') {
      rawSourceText = await extractLegacyWordText(document.bytes);
      if (!rawSourceText.trim()) throw new Error('Legacy DOC contains no readable text');
      input = [{ type: 'text', text: `${prompt}\n\nLegacy Word document text:\n${rawSourceText}` }];
    } else if (document.extension === 'xlsx' || document.extension === 'xls') {
      rawSourceText = extractExcelText(document.bytes);
      input = [{ type: 'text', text: `${prompt}\n\nExcel workbook:\n${rawSourceText}` }];
    } else if (document.extension === 'txt') {
      rawSourceText = document.bytes.toString('utf8');
      input = [{ type: 'text', text: `${prompt}\n\nDocument text:\n${rawSourceText}` }];
    } else {
      throw new Error('Unsupported file format');
    }
    parseDocStructureIntermediate(rawSourceText);
    result = await gemini({
      input,
      response_format: { type: 'text', mime_type: 'application/json', schema: analysisSchema }
    });
  } else if (body?.text) {
    rawSourceText = String(body.text);
    parseDocStructureIntermediate(rawSourceText);
    result = await gemini({
      input: [
        { type: 'text', text: prompt },
        { type: 'text', text: body.text }
      ],
      response_format: { type: 'text', mime_type: 'application/json', schema: analysisSchema }
    });
  } else {
    throw new Error('No file or text provided');
  }

  const raw = outputText(result).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  if (!raw) throw new Error('Gemini returned an empty analysis');
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error('Gemini returned invalid analysis JSON'); }
  const weeks = parsed.weeks;
  if (!Array.isArray(weeks) || !weeks.length || weeks.some(week => !Array.isArray(week.sessions) || week.sessions.some(session => !Array.isArray(session.exercises)))) {
    throw new Error('Gemini returned an invalid weeks/sessions/exercises structure');
  }

  let totalGeminiSessions = 0;
  let totalGeminiExercises = 0;
  parsed.weeks.forEach(w => {
    if (Array.isArray(w.sessions)) {
      totalGeminiSessions += w.sessions.length;
      w.sessions.forEach(s => {
        const c = (s.exercises || []).length;
        totalGeminiExercises += c;
        console.info(`DOC_SESSION: week=${w.week} session=${s.title || s.day} is_bonus=${Boolean(s.is_bonus)} exerciseCount=${c}`);
      });
    }
  });
  console.info(`DOC_GEMINI_SESSIONS=${totalGeminiSessions}`);
  console.info(`DOC_GEMINI_EXERCISES=${totalGeminiExercises}`);

  return parsed;
}

export function applyOperationsToProgram(program, operations) {
  if (!program || typeof program !== 'object') throw new Error('Program must be a non-null object.');
  if (!Array.isArray(operations) || !operations.length) return { ok: true, program, appliedCount: 0 };

  const cloned = JSON.parse(JSON.stringify(program));
  if (!Array.isArray(cloned.weeks) || !cloned.weeks.length) throw new Error('Program has no valid weeks array.');

  let appliedCount = 0;

  for (let opIdx = 0; opIdx < operations.length; opIdx++) {
    const op = operations[opIdx];
    const type = op.type;
    const targetWeekNum = op.week;
    const targetSessionSpec = op.session;
    const targetExName = String(op.exercise || '').toLowerCase();
    const targetExId = op.exercise_id;
    const targetSetIndex = op.set_index;
    const changes = op.changes || {};

    const weeksToModify = targetWeekNum === 'all' || targetWeekNum == null
      ? cloned.weeks
      : cloned.weeks.filter(w => (w.weekNumber ?? w.week) === Number(targetWeekNum) || w.id === targetWeekNum);

    if (!weeksToModify.length && targetWeekNum !== 'all') {
      throw new Error(`Target week not found in program: ${targetWeekNum}`);
    }

    if (type === 'add_week') {
      const newWeekNum = cloned.weeks.length + 1;
      const template = cloned.weeks[cloned.weeks.length - 1];
      const newWeek = JSON.parse(JSON.stringify(template));
      newWeek.id = `w${newWeekNum}`;
      newWeek.weekNumber = newWeekNum;
      newWeek.week = newWeekNum;
      newWeek.label = changes.label || `Settimana ${newWeekNum}`;
      cloned.weeks.push(newWeek);
      appliedCount++;
      continue;
    }

    if (type === 'remove_week') {
      const weekIndex = cloned.weeks.findIndex(w => (w.weekNumber ?? w.week) === Number(targetWeekNum) || w.id === targetWeekNum);
      if (weekIndex >= 0) {
        cloned.weeks.splice(weekIndex, 1);
        appliedCount++;
      }
      continue;
    }

    if (type === 'modify_week') {
      weeksToModify.forEach(w => {
        if (changes.label) w.label = changes.label;
        if (changes.title) w.title = changes.title;
        appliedCount++;
      });
      continue;
    }

    weeksToModify.forEach(w => {
      const sessions = w.sessions || w.days || [];
      const sessionsToModify = targetSessionSpec === 'all' || targetSessionSpec == null
        ? sessions
        : sessions.filter((s, idx) => {
            const sNum = parseInt(targetSessionSpec, 10);
            if (Number.isFinite(sNum)) return idx === sNum - 1 || idx === sNum;
            return s.id === targetSessionSpec || (s.title && s.title.toLowerCase().includes(String(targetSessionSpec).toLowerCase()));
          });

      if (type === 'add_session') {
        const newSessionId = `${w.id || 'w'+(w.weekNumber||w.week)}_s${sessions.length + 1}`;
        const newSession = {
          id: newSessionId,
          title: changes.title || `SESSIONE ${sessions.length + 1}`,
          day: changes.day || `Giorno ${sessions.length + 1}`,
          is_bonus: Boolean(changes.is_bonus),
          exercises: []
        };
        sessions.push(newSession);
        w.sessions = sessions;
        appliedCount++;
        return;
      }

      if (type === 'remove_session') {
        const sIndex = sessions.findIndex((s, idx) => {
          const sNum = parseInt(targetSessionSpec, 10);
          if (Number.isFinite(sNum)) return idx === sNum - 1 || idx === sNum;
          return s.id === targetSessionSpec || (s.title && s.title.toLowerCase().includes(String(targetSessionSpec).toLowerCase()));
        });
        if (sIndex >= 0) {
          sessions.splice(sIndex, 1);
          appliedCount++;
        }
        return;
      }

      if (type === 'modify_session') {
        sessionsToModify.forEach(s => {
          if (changes.title) s.title = changes.title;
          if (changes.day) s.day = changes.day;
          if (changes.is_bonus !== undefined) s.is_bonus = Boolean(changes.is_bonus);
          appliedCount++;
        });
        return;
      }

      sessionsToModify.forEach(s => {
        const exercises = s.exercises || s.rows || [];

        if (type === 'add_exercise') {
          const exName = op.target_exercise || op.exercise || changes.name || 'Nuovo Esercizio';
          const setsCount = Number(changes.sets || 3);
          const setsList = Array.from({ length: setsCount }, (_, i) => ({
            id: `${s.id || 's'}_e${exercises.length + 1}_s${i + 1}`,
            order: i + 1,
            reps: changes.reps || '8-10',
            load: changes.load != null ? Number(changes.load) : null,
            load_unit: changes.load_unit || 'kg',
            percentage_1rm: changes.percentage_1rm != null ? Number(changes.percentage_1rm) : null,
            rpe: changes.rpe != null ? Number(changes.rpe) : null,
            rir: changes.rir != null ? Number(changes.rir) : 1,
            rest_seconds: changes.rest_seconds || 90,
            tempo: changes.tempo || '',
            done: false
          }));

          exercises.push({
            id: `${s.id || 's'}_e${exercises.length + 1}`,
            name: exName,
            exercise: exName,
            order: exercises.length + 1,
            movement: changes.movement || 'ALTRO',
            muscle_groups: Array.isArray(changes.muscle_groups) ? changes.muscle_groups : (changes.muscle_group ? [changes.muscle_group] : []),
            muscle_group: changes.muscle_group || null,
            superset_id: changes.superset_id || null,
            notes: changes.notes || '',
            progression_rule: changes.progression_rule || '',
            is_bonus: Boolean(changes.is_bonus || s.is_bonus),
            sets: setsList,
            repsTarget: changes.reps || '8-10',
            rirTarget: changes.rir != null ? Number(changes.rir) : 1,
            rpeTarget: changes.rpe != null ? Number(changes.rpe) : null,
            rest: changes.rest || '90s',
            plannedLoad: changes.load != null ? Number(changes.load) : null,
            tempo: changes.tempo || ''
          });
          s.exercises = exercises;
          s.rows = exercises;
          appliedCount++;
          return;
        }

        if (type === 'remove_exercise') {
          const initialLen = exercises.length;
          const filtered = exercises.filter(ex => {
            const matchName = targetExName && String(ex.name || ex.exercise || '').toLowerCase().includes(targetExName);
            const matchId = targetExId && ex.id === targetExId;
            return !(matchName || matchId);
          });
          s.exercises = filtered;
          s.rows = filtered;
          appliedCount += (initialLen - filtered.length);
          return;
        }

        if (type === 'replace_exercise') {
          exercises.forEach(ex => {
            const matchName = targetExName && String(ex.name || ex.exercise || '').toLowerCase().includes(targetExName);
            const matchId = targetExId && ex.id === targetExId;
            if (matchName || matchId) {
              const newName = op.target_exercise || changes.name || 'Esercizio Sostitutivo';
              ex.name = newName;
              ex.exercise = newName;
              if (changes.movement) ex.movement = changes.movement;
              if (changes.muscle_groups) ex.muscle_groups = changes.muscle_groups;
              if (changes.notes) ex.notes = changes.notes;
              appliedCount++;
            }
          });
          return;
        }

        if (type === 'create_superset') {
          const ssId = changes.superset_id || `ss_${Date.now().toString(36)}`;
          const names = [targetExName, String(op.target_exercise || '').toLowerCase()].filter(Boolean);
          exercises.forEach(ex => {
            const currentName = String(ex.name || ex.exercise || '').toLowerCase();
            if (names.some(n => currentName.includes(n)) || (targetExId && ex.id === targetExId)) {
              ex.superset_id = ssId;
              appliedCount++;
            }
          });
          return;
        }

        if (type === 'remove_superset') {
          exercises.forEach(ex => {
            const matchName = targetExName && String(ex.name || ex.exercise || '').toLowerCase().includes(targetExName);
            const matchId = targetExId && ex.id === targetExId;
            const matchSS = changes.superset_id && ex.superset_id === changes.superset_id;
            if (matchName || matchId || matchSS) {
              ex.superset_id = null;
              appliedCount++;
            }
          });
          return;
        }

        exercises.forEach(ex => {
          const matchName = targetExName && String(ex.name || ex.exercise || '').toLowerCase().includes(targetExName);
          const matchId = targetExId && ex.id === targetExId;
          if (!matchName && !matchId && targetExName) return;

          if (!Array.isArray(ex.sets)) {
            const n = typeof ex.sets === 'number' ? ex.sets : 3;
            ex.sets = Array.from({ length: n }, (_, i) => ({
              id: `${ex.id}_s${i + 1}`,
              order: i + 1,
              reps: ex.repsTarget || ex.reps || '8-10',
              load: ex.plannedLoad || ex.load || null,
              load_unit: ex.load_unit || 'kg',
              percentage_1rm: ex.percentage_1rm || null,
              rpe: ex.rpeTarget || ex.rpe || null,
              rir: ex.rirTarget || ex.rir || 1,
              rest_seconds: ex.rest_seconds || 90,
              tempo: ex.tempo || '',
              done: false
            }));
          }

          if (type === 'add_set') {
            const newOrder = ex.sets.length + 1;
            ex.sets.push({
              id: `${ex.id}_s${newOrder}`,
              order: newOrder,
              reps: changes.reps || ex.sets[ex.sets.length - 1]?.reps || '8-10',
              load: changes.load != null ? Number(changes.load) : (ex.sets[ex.sets.length - 1]?.load || null),
              load_unit: changes.load_unit || 'kg',
              percentage_1rm: changes.percentage_1rm != null ? Number(changes.percentage_1rm) : null,
              rpe: changes.rpe != null ? Number(changes.rpe) : null,
              rir: changes.rir != null ? Number(changes.rir) : 1,
              rest_seconds: changes.rest_seconds || 90,
              tempo: changes.tempo || ex.tempo || '',
              done: false
            });
            appliedCount++;
            return;
          }

          if (type === 'remove_set') {
            if (ex.sets.length > 1) {
              const setIdx = targetSetIndex != null ? targetSetIndex - 1 : ex.sets.length - 1;
              if (setIdx >= 0 && setIdx < ex.sets.length) {
                ex.sets.splice(setIdx, 1);
                ex.sets.forEach((s, idx) => { s.order = idx + 1; });
                appliedCount++;
              }
            }
            return;
          }

          if (type === 'modify_set') {
            const setIdx = targetSetIndex != null ? targetSetIndex - 1 : 0;
            const targetSet = ex.sets[setIdx];
            if (targetSet) {
              if (changes.load !== undefined) targetSet.load = changes.load != null ? Number(changes.load) : null;
              if (changes.reps !== undefined) targetSet.reps = changes.reps;
              if (changes.rpe !== undefined) targetSet.rpe = changes.rpe != null ? Number(changes.rpe) : null;
              if (changes.rir !== undefined) targetSet.rir = changes.rir != null ? Number(changes.rir) : null;
              if (changes.rest_seconds !== undefined) targetSet.rest_seconds = changes.rest_seconds;
              if (changes.tempo !== undefined) targetSet.tempo = changes.tempo;
              if (changes.done !== undefined) targetSet.done = Boolean(changes.done);
              appliedCount++;
            }
            return;
          }

          if (type === 'modify_load') {
            const targetLoad = Number(changes.load);
            if (targetSetIndex != null) {
              const set = ex.sets[targetSetIndex - 1];
              if (set) { set.load = targetLoad; appliedCount++; }
            } else {
              ex.sets.forEach(s => { s.load = targetLoad; });
              ex.plannedLoad = targetLoad;
              appliedCount++;
            }
            return;
          }

          if (type === 'modify_reps') {
            if (targetSetIndex != null) {
              const set = ex.sets[targetSetIndex - 1];
              if (set) { set.reps = changes.reps; appliedCount++; }
            } else {
              ex.sets.forEach(s => { s.reps = changes.reps; });
              ex.repsTarget = changes.reps;
              appliedCount++;
            }
            return;
          }

          if (type === 'modify_rpe' || type === 'modify_rir') {
            const val = changes.rpe !== undefined ? Number(changes.rpe) : Number(changes.rir);
            const field = type === 'modify_rpe' ? 'rpe' : 'rir';
            if (targetSetIndex != null) {
              const set = ex.sets[targetSetIndex - 1];
              if (set) { set[field] = val; appliedCount++; }
            } else {
              ex.sets.forEach(s => { s[field] = val; });
              if (type === 'modify_rpe') ex.rpeTarget = val; else ex.rirTarget = val;
              appliedCount++;
            }
            return;
          }

          if (type === 'modify_rest') {
            const restVal = changes.rest || `${changes.rest_seconds}s`;
            ex.rest = restVal;
            ex.rest_seconds = changes.rest_seconds || parseInt(restVal, 10);
            ex.sets.forEach(s => { s.rest_seconds = ex.rest_seconds; });
            appliedCount++;
            return;
          }

          if (type === 'modify_tempo') {
            ex.tempo = changes.tempo;
            ex.sets.forEach(s => { s.tempo = changes.tempo; });
            appliedCount++;
            return;
          }

          if (type === 'modify_exercise') {
            if (changes.name) { ex.name = changes.name; ex.exercise = changes.name; }
            if (changes.movement) ex.movement = changes.movement;
            if (changes.notes) ex.notes = changes.notes;
            if (changes.reps) ex.repsTarget = changes.reps;
            if (changes.load != null) ex.plannedLoad = Number(changes.load);
            if (changes.rest) ex.rest = changes.rest;
            appliedCount++;
            return;
          }
        });
      });
    });
  }

  return { ok: true, program: cloned, appliedCount };
}

async function coach({ message, context, history, program, trainingData, bodyweight }) {
  if (typeof message !== 'string' || !message.trim()) throw new Error('Message is required');
  const trainingContext = JSON.stringify(context || { program, trainingData, bodyweight }).slice(0, 180000);
  const previous = Array.isArray(history) ? history.slice(-20).map(item => `${item.role || 'user'}: ${item.content || item.message || item.text || ''}`).join('\n') : '';
  const coachPrompt = `Sei Coach AI, l'assistente scientifico di allenamento all'interno dell'app Giammaria System.
Rispondi in italiano in modo chiaro, evidence-based e rigoroso.
Hai PIENO ACCESSO in tempo reale alla programmazione attiva dell'utente. NON dire MAI che non hai accesso al database o al file di programmazione.

TOOL OPERATION SUPPORT (MODIFICA PROGRAMMA):
Quando l'atleta chiede di modificare, aggiungere, eliminare o sostituire serie, carichi, ripetizioni, RPE, RIR, recuperi, esercizi, creare superset o gestire sessioni/settimane, genera un blocco JSON con action "modify_program" contenente l'elenco atomico di operazioni:

\`\`\`json
{
  "action": "modify_program",
  "summary": "Breve descrizione in italiano della modifica",
  "operations": [
    {
      "type": "add_set" | "remove_set" | "modify_set" | "modify_exercise" | "add_exercise" | "remove_exercise" | "replace_exercise" | "modify_load" | "modify_reps" | "modify_rpe" | "modify_rir" | "modify_rest" | "modify_tempo" | "modify_week" | "modify_session" | "create_superset" | "remove_superset",
      "week": 1,
      "session": 1,
      "exercise": "Panca piana",
      "target_exercise": "Leg Press",
      "set_index": 1,
      "changes": {
        "sets": 4,
        "load": 100,
        "reps": "6-8",
        "rpe": 8,
        "rir": 2,
        "rest": "120s",
        "tempo": "3-0-1",
        "notes": "..."
      }
    }
  ]
}
\`\`\`

Conversation history:
${previous}

Athlete question: ${message}

Training context: ${trainingContext}`;

  const result = await gemini({ input: coachPrompt });
  const reply = outputText(result).trim();
  if (!reply) throw new Error('Gemini returned an empty coach response');

  let proposedAction = null;
  const jsonMatch = reply.match(/```(?:json)?\s*(\{[^]*?"action"\s*:\s*"modify_program"[^]*?\})\s*```/i);
  if (jsonMatch) {
    try {
      proposedAction = JSON.parse(jsonMatch[1]);
    } catch (_) {}
  }

  return { reply, proposed_action: proposedAction, model };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const path = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;
  if (req.method === 'GET' && (path === '/' || path === '/health')) return json(res, 200, { ok: true, service: 'giammaria-coach-api', model, mock: mockGemini });
  const analyzePath = path === '/analyze' || path === '/api/analyze' || path === '/api/analyze-file';
  const coachPath = path === '/coach' || path === '/api/chat' || path === '/api/coach';
  const modifyPath = path === '/api/program/modify';
  const activeProgPath = path === '/api/program/active';

  if (req.method === 'GET' && activeProgPath) {
    return json(res, 200, { ok: true, program: null });
  }

  if (req.method !== 'POST' || (!analyzePath && !coachPath && !modifyPath)) return json(res, 404, { error: 'Not found' });
  try {
    const body = await readBody(req);
    if (modifyPath) {
      const { program, operations } = body || {};
      const resMod = applyOperationsToProgram(program, operations || []);
      return json(res, 200, resMod);
    }
    json(res, 200, analyzePath ? await analyze(body) : await coach(body));
  }
  catch (error) {
    console.error('Request error:', error && (error.stack || error.message || error));
    const message = error?.message || 'Unexpected error';
    const status = message === 'Payload too large' ? 413 : (/timed out/i.test(message) ? 504 : (/gemini|empty coach response|invalid analysis json/i.test(message) ? 500 : 400));
    const response = { error: process.env.NODE_ENV === 'development' || !error?.isGemini ? message : 'Gemini request failed' };
    if (process.env.NODE_ENV === 'development' && error?.isGemini) {
      response.gemini = { name: error.name, message: error.message, status: error.status, details: error.details };
    }
    json(res, status, response);
  }
});

server.listen(port, () => console.log(`Giammaria Gemini Coach API listening on :${port}`));

export { server, coach, analyze };
