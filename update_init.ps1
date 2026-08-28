$rawHtml = [System.IO.File]::ReadAllText("$PSScriptRoot\web\index.html", [System.Text.Encoding]::UTF8)

$initStart = $rawHtml.IndexOf("function init(){")
$marker = "// ====================================================" + [Environment]::NewLine + "// TASK 14:"
$task14Start = $rawHtml.IndexOf($marker, $initStart)
if ($task14Start -lt 0) {
  $marker = "// ====================================================" + "`n" + "// TASK 14:"
  $task14Start = $rawHtml.IndexOf($marker, $initStart)
}
if ($task14Start -lt 0) {
  $task14Start = $rawHtml.IndexOf("TASK 14: CLIENT-SIDE UNIVERSAL IMPORT ENGINE", $initStart)
  $task14Start = $rawHtml.LastIndexOf("//", $task14Start)
  $task14Start = $rawHtml.LastIndexOf("//", $task14Start - 1)
}

Write-Output "initStart: $initStart, task14Start: $task14Start"

$cleanBlock = @'
function init(){
  if(store.activeProgram) {
    DATA = normalizeProgram(store.activeProgram);
    finishInit();
  } else {
    let xhr = new XMLHttpRequest(); xhr.open('GET', 'data.json', true);
    xhr.onreadystatechange = function(){
      if(xhr.readyState === 4){
        try {
          if(xhr.status < 200 || xhr.status >= 300) throw new Error('Impossibile caricare data.json (' + xhr.status + ').');
          DATA = normalizeProgram(JSON.parse(xhr.responseText));
          finishInit();
        } catch(error) {
          console.error('DATA_LOAD_ERROR', error);
          $('splash').style.display = 'none';
          $('view-container').innerHTML = '<div class="card"><div class="msg ai" style="color:var(--accent-red);">Impossibile caricare la programmazione: ' + esc(error.message) + '</div></div>';
        }
      }
    };
    xhr.onerror = function(){
      console.error('DATA_LOAD_NETWORK_ERROR');
      $('splash').style.display = 'none';
      $('view-container').innerHTML = '<div class="card"><div class="msg ai" style="color:var(--accent-red);">Impossibile caricare la programmazione.</div></div>';
    };
    xhr.send();
  }
}

function finishInit() {
  updateAccountButton();
  setTimeout(() => {
    const splash = $('splash');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => {
        splash.style.display = 'none';
        render();
      }, 800);
    } else {
      render();
    }
  }, 1200);
}

function persist(){
  localStorage.setItem('GS_STORE', JSON.stringify(store));
  scheduleAccountSync();
  updateAccountButton();
}

function navigate(v, e){
  if(e) e.preventDefault();
  console.debug(v === 'home' ? 'HOME_CLICK' : 'NAVIGATION', { view: v });
  currentView = v;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const a = $('nav-' + v); if(a) a.classList.add('active');
  render();
  window.scrollTo(0, 0);
}

function render(){
  const c = $('view-container'); if(!c) return;
  if(!DATA){
    c.innerHTML = '<div class="card"><div class="msg ai" style="color:var(--accent-red);">Caricamento programmazione in corso…</div></div>';
    return;
  }
  c.innerHTML = '';
  if(currentView === 'home') renderHome(c);
  else if(currentView === 'training') renderTraining(c);
  else if(currentView === 'stats') renderStats(c);
  else if(currentView === 'ai') renderAI(c);
  else if(currentView === 'db') renderDb(c);
  else if(currentView === 'programs') renderPrograms(c);
  else if(currentView === 'import') renderImport(c);
}

function handleImportFileSelected(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (!window.importEngineState) window.importEngineState = { selectedFile: null, imports: [] };
  window.importEngineState.selectedFile = file;
  if (currentView === 'import') render();
}

function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return '0 KB';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function apiFetchJson(url, options = {}, timeoutMs = 90000) {
  const res = await apiFetch(url, options, timeoutMs);
  return readApiJson(res);
}


'@

$newHtml = $rawHtml.Substring(0, $initStart) + $cleanBlock + $rawHtml.Substring($task14Start)

[System.IO.File]::WriteAllText("$PSScriptRoot\web\index.html", $newHtml, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText("$PSScriptRoot\app\src\main\assets\index.html", $newHtml, [System.Text.Encoding]::UTF8)
Write-Output "Cleanly updated web/index.html and app/src/main/assets/index.html!"
