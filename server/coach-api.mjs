import http from 'node:http';
import { GoogleGenAI } from '@google/genai';
import mammoth from 'mammoth';

const port = Number(process.env.PORT || 8787);
const apiKey = process.env.GEMINI_API_KEY;
const mockGemini = Boolean(process.env.MOCK_GEMINI && process.env.MOCK_GEMINI !== '0');
const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const maxBytes = 16 * 1024 * 1024;
const geminiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;

if (!apiKey && !mockGemini) throw new Error('GEMINI_API_KEY must be set on the server or enable MOCK_GEMINI=1 for local testing.');

const exerciseSchema = { type: 'object', additionalProperties: false, required: ['name', 'order', 'sets', 'reps', 'load', 'load_unit', 'percentage_1rm', 'rpe', 'rir', 'rest_seconds', 'tempo', 'notes', 'progression_rule'], properties: {
  name: { type: 'string' }, order: { type: 'integer' }, sets: { type: 'integer' }, reps: { type: 'string' }, load: { type: ['number', 'null'] },
  load_unit: { type: ['string', 'null'] }, percentage_1rm: { type: ['number', 'null'] }, rpe: { type: ['number', 'null'] }, rir: { type: ['number', 'null'] },
  rest_seconds: { type: ['integer', 'null'] }, tempo: { type: ['string', 'null'] }, notes: { type: ['string', 'null'] }, progression_rule: { type: ['string', 'null'] }
} };
const sessionSchema = { type: 'object', additionalProperties: false, required: ['day', 'title', 'exercises'], properties: { day: { type: 'string' }, title: { type: 'string' }, exercises: { type: 'array', items: exerciseSchema } } };
const weekSchema = { type: 'object', additionalProperties: false, required: ['week', 'label', 'sessions'], properties: { week: { type: 'integer' }, label: { type: 'string' }, sessions: { type: 'array', items: sessionSchema } } };
const programSchema = { type: 'object', additionalProperties: false, required: ['weeks'], properties: {
  title: { type: 'string' }, source_summary: { type: 'string' }, assumptions: { type: 'array', items: { type: 'string' } },
  global_rules: { type: 'array', items: { type: 'string' } }, warnings: { type: 'array', items: { type: 'string' } },
  weeks: { type: 'array', items: weekSchema }
} };
const analysisSchema = programSchema;

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const contentType = String(req.headers['content-type'] || '');
    if (contentType.startsWith('multipart/form-data')) {
      // Basic multipart parser (lightweight; suitable for small uploads). Not RFC-complete.
      const m = contentType.match(/boundary=(?:"?)([^;"]+)/i);
      if (!m) return reject(new Error('Missing multipart boundary'));
      const boundary = '--' + m[1];
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (buf.length > maxBytes) return reject(new Error('Payload too large'));
        // Use binary string to preserve raw bytes for file bodies
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
          const nameMatch = cd.match(/name="([^\"]+)"/i);
          const filenameMatch = cd.match(/filename="([^\"]+)"/i);
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
    // Fallback: read as text or urlencoded
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
            sessions: [{ day: 'Day 1', title: 'Mock session', exercises: [{
                name: 'Mock exercise',
                order: 1,
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
    return { steps: [{ type: 'model_output', content: [{ type: 'text', text: mockOutput }] }] };
  }
  try {
    console.info('Gemini request', { model, inputType: Array.isArray(payload.input) ? 'multimodal' : 'text' });
    return await geminiClient.interactions.create({ model, store: false, ...payload }, { timeout_ms: 90000 });
  } catch (error) {
    console.error('Gemini error', {
      status: error?.status || error?.statusCode || error?.response?.status,
      message: error?.message,
      details: error?.details,
      stack: error?.stack
    });
    throw new Error(`Gemini request failed: ${error?.message || 'unknown SDK error'}`);
  }
}
function outputText(result) {
  if (result?.output_text || result?.outputText) return result.output_text || result.outputText;
  const steps = Array.isArray(result?.steps) ? result.steps : [];
  const stepText = steps
    .filter(step => step?.type === 'model_output')
    .flatMap(step => Array.isArray(step.content) ? step.content : [])
    .filter(block => block?.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('');
  if (stepText) return stepText;
  return result?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
}
function validateFile({ filename, mimeType, dataBase64 }) {
  if (!filename || !dataBase64) throw new Error('File missing');
  if (!/\.(pdf|doc|docx|txt)$/i.test(filename)) throw new Error('Only PDF, DOC, DOCX and TXT files are supported');
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
  const prompt = 'Extract the workout plan faithfully. Return ONLY JSON matching the supplied schema, with weeks[].sessions[].exercises[] (never weeks[].days[]). Each exercise MUST include name, order, sets, reps, load, load_unit, percentage_1rm, rpe, rir, rest_seconds, tempo, notes and progression_rule. Preserve every exercise, session, set count, reps, rest and intensity exactly as written; use null when absent, do not invent or merge entries. Also return title, source_summary, assumptions, global_rules and warnings. If uncertain, add a warning instead of guessing.';
  let result;
  if (body?.file) {
    const document = validateFile({ filename: body.file.filename, mimeType: body.file.mimeType, dataBase64: body.file.dataBase64 });
    console.info('Analyze input', { filename: document.filename, extension: document.extension, bytes: document.bytes.length, mimeType: document.mime_type });
    let input;
    if (document.extension === 'pdf') {
      input = [{ type: 'text', text: prompt }, { type: 'document', data: document.data, mime_type: 'application/pdf' }];
    } else if (document.extension === 'docx') {
      const extracted = await mammoth.extractRawText({ buffer: document.bytes });
      input = [{ type: 'text', text: `${prompt}\n\nDocument text:\n${extracted.value}` }];
    } else if (document.extension === 'txt') {
      input = [{ type: 'text', text: `${prompt}\n\nDocument text:\n${document.bytes.toString('utf8')}` }];
    } else {
      throw new Error('DOC files are not supported; upload PDF, DOCX or TXT');
    }
    result = await gemini({
      input,
      response_format: { type: 'text', mime_type: 'application/json', schema: analysisSchema }
    });
  } else if (body?.text) {
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
  return parsed;
}
async function coach({ message, context, history, program, trainingData, bodyweight }) {
  if (typeof message !== 'string' || !message.trim()) throw new Error('Message is required');
  const trainingContext = JSON.stringify(context || { program, trainingData, bodyweight }).slice(0, 180000);
  const previous = Array.isArray(history) ? history.slice(-20).map(item => `${item.role || 'user'}: ${item.content || item.message || ''}`).join('\n') : '';
  const result = await gemini({ input: `You are an evidence-informed strength and hypertrophy coach. Base advice only on the supplied program and training data; state uncertainty clearly. Give concise, actionable advice in Italian. Do not diagnose injuries, prescribe treatment, or replace a clinician. For pain, dizziness, chest symptoms, or injury, advise stopping and seeking qualified medical care.\n\nConversation history:\n${previous}\n\nAthlete question: ${message}\n\nTraining context: ${trainingContext}` });
  const reply = outputText(result).trim();
  if (!reply) throw new Error('Gemini returned an empty coach response');
  return { reply, model };
}

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const path = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;
  if (req.method === 'GET' && (path === '/' || path === '/health')) return json(res, 200, { ok: true, service: 'giammaria-coach-api', model, mock: mockGemini });
  const analyzePath = path === '/analyze' || path === '/api/analyze';
  const coachPath = path === '/coach' || path === '/api/chat' || path === '/api/coach';
  if (req.method !== 'POST' || (!analyzePath && !coachPath)) return json(res, 404, { error: 'Not found' });
  try {
    const body = await readBody(req);
    json(res, 200, analyzePath ? await analyze(body) : await coach(body));
  }
  catch (error) {
    console.error('Request error:', error && (error.stack || error.message || error));
    const message = error?.message || 'Unexpected error';
    const status = message === 'Payload too large' ? 413 : (/timed out/i.test(message) ? 504 : (/gemini|empty coach response|invalid analysis json/i.test(message) ? 500 : 400));
    json(res, status, { error: message });
  }
}).listen(port, () => console.log(`Giammaria Gemini Coach API listening on :${port}`));
