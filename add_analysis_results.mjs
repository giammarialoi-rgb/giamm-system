import fs from 'fs';

let html = fs.readFileSync('web/index.base.html', 'utf8');

const target = `<span id="voice-status" style="font-size:10px;color:#777;align-self:center;"></span>
        </div>`;

const replacement = `<span id="voice-status" style="font-size:10px;color:#777;align-self:center;"></span>
        </div>
        <div id="analysis-results" style="display:none;"></div>`;

if (html.includes(target)) {
  html = html.replace(target, replacement);
  console.log('✓ Added #analysis-results to renderAI in web/index.base.html');
} else {
  console.log('Target not found');
}

fs.writeFileSync('web/index.base.html', html, 'utf8');
