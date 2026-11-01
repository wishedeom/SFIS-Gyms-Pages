/* The launch shell reads settings first, then starts the selected simulation automatically. */
const $ = (id) => document.getElementById(id);
const originalFetch = window.fetch.bind(window);
let audioMuted = false, audioSent = false;
try {
  const saved = JSON.parse(localStorage.getItem('stealth-audio') || 'null');
  if (saved && typeof saved.muted === 'boolean') audioMuted = saved.muted;
} catch (_) {}
function updateAudio(send = true) {
  const silent = audioMuted;
  $('mute').setAttribute('aria-pressed', String(silent));
  $('mute').setAttribute('aria-label', silent ? 'Unmute game audio' : 'Mute game audio');
  $('mute').title = silent ? 'Unmute game audio' : 'Mute game audio';
  try { localStorage.setItem('stealth-audio', JSON.stringify({muted:audioMuted})); } catch (_) {}
  if (send && window.stealthControl) {
    window.stealthControl('audio', JSON.stringify({muted:audioMuted}));
    audioSent = true;
  }
}
$('mute').addEventListener('click', () => {
  audioMuted = !audioMuted;
  updateAudio();
  syncFullscreenControls?.();
});
updateAudio(false);
let manifest, engine, bytesFetched = 0, bytesCached = 0;
let loading = false, startupTimer;
const mobileTouch = window.matchMedia('(pointer: coarse)').matches || !!window.navigator?.maxTouchPoints || new URL(location.href).searchParams.get('dev_touch') === '1';
if (mobileTouch) $('viewport').classList.add('mobile-touch');
let latestGameState = null;
let perspectiveMenu = null;
let gameMenuOpen = true;
let acceptedRunSelection = '';
let mapListPointer = null;
let suppressMapClickUntil = 0;

function gameCanvasMapping() {
  const canvas = $('canvas'), bounds = canvas.getBoundingClientRect();
  const scale = Math.min(bounds.width / canvas.width, bounds.height / canvas.height);
  const width = canvas.width * scale, height = canvas.height * scale;
  return {left:bounds.left + (bounds.width - width) / 2, top:bounds.top + (bounds.height - height) / 2,
    width, height};
}
function insideMapList(event) {
  const list = latestGameState?.map_list_rect;
  if (!Array.isArray(list) || list.length !== 4 || list.some(value => !Number.isFinite(value))) return false;
  const scene = gameCanvasMapping();
  const x = (event.clientX - scene.left) / scene.width, y = (event.clientY - scene.top) / scene.height;
  return x >= list[0] && x <= list[0] + list[2] && y >= list[1] && y <= list[1] + list[3];
}
// Scrolling is deliberately explicit: a negative finger Y delta increases
// Godot's vertical offset, showing later map rows. This avoids browser-specific
// touch arbitration around the WebAssembly canvas.
document.addEventListener('pointerdown', event => {
  if (!gameMenuOpen || event.button !== 0) return;
  suppressMapClickUntil = 0;
  if (!insideMapList(event)) return;
  window.stealthControl?.('menu_pointer_begin');
  mapListPointer = {id:event.pointerId, y:event.clientY, dragging:false};
}, {capture:true});
document.addEventListener('pointermove', event => {
  const pointer = mapListPointer;
  if (!pointer || pointer.id !== event.pointerId) return;
  if (!pointer.dragging && Math.abs(event.clientY - pointer.y) < 8) return;
  if (!pointer.dragging) {
    pointer.dragging = true;
    window.stealthControl?.('menu_scroll_begin');
  }
  const scene = gameCanvasMapping();
  const deltaY = (event.clientY - pointer.y) / scene.height;
  pointer.y = event.clientY;
  window.stealthControl?.('menu_scroll', JSON.stringify({delta_y:deltaY}));
  event.preventDefault();
}, {capture:true, passive:false});
function finishMapListPointer(event) {
  if (!mapListPointer || mapListPointer.id !== event.pointerId) return;
  if (mapListPointer.dragging) {
    window.stealthControl?.('menu_scroll_end');
    suppressMapClickUntil = performance.now() + 500;
  }
  mapListPointer = null;
}
document.addEventListener('pointerup', finishMapListPointer, {capture:true});
document.addEventListener('pointercancel', finishMapListPointer, {capture:true});
document.addEventListener('click', event => {
  if (gameMenuOpen && performance.now() < suppressMapClickUntil) {
    suppressMapClickUntil = 0;
    event.preventDefault(); event.stopImmediatePropagation();
  }
}, {capture:true});
// Browser storage is only an adapter; Godot owns menu state and validation.
window.stealthReadLastMap = () => { try { return localStorage.getItem('stealth-last-map-v1') || ''; } catch (_) { return ''; } };
window.stealthWriteLastMap = text => { try { localStorage.setItem('stealth-last-map-v1', String(text)); } catch (_) {} };
let selectedModel = 'human';
const wallTextureIds = ['untextured', 'weathered_concrete', 'concrete_blocks', 'industrial_steel'];
let selectedWallTexture = 'untextured';
let wallTextureApplied = false;
let pendingWallTexture = null;
const touch = new WebTouchControls({root:$('viewport'), stick:$('touch-stick'), knob:$('touch-knob'), look:$('touch-look'), lookKnob:$('touch-look-knob'),
  buttons:[...document.querySelectorAll('[data-touch-action]')], send:(...args) => window.stealthControl?.(...args)});
const quickbar = new QuickBarDrawer({root:$('quickbar-drawer'), send:(...args) => window.stealthControl?.(...args),
  onOpenChange:() => { touch.reset(); updateTouch(); }});
const overviewCamera = new OverviewCameraControls({canvas:$('canvas'), send:(...args) => window.stealthControl?.(...args)});
perspectiveMenu = new PerspectiveMenu({root:$('perspective-menu'), toggle:$('perspective-toggle'), panel:$('perspective-choices'), tooltip:$('perspective-tooltip'), buttons:[...document.querySelectorAll('[data-perspective]')], send:command => { touch.reset(); window.stealthControl?.(command); }, onOpen:() => setFullscreenMenu(false)});
const recordingInspector = new RecordingInspector(document, packet => {
  touch.reset(); window.stealthControl?.('debug', JSON.stringify(packet));
});
const debugVisuals = new DebugVisualControls(document, packet => {
  window.stealthControl?.('debug_visuals', JSON.stringify(packet));
}, () => touch.reset());
const performancePanel = new PerformancePanel(document, packet => {
  window.stealthControl?.('performance', JSON.stringify(packet));
}, () => { touch.reset(); if (document.pointerLockElement) document.exitPointerLock(); }, {mobile:mobileTouch});
window.performanceReport = json => performancePanel.update(JSON.parse(json));
window.debugReport = json => recordingInspector.update(JSON.parse(json));
window.debugError = message => recordingInspector.error(message);
window.debugDownload = json => {
  const url = URL.createObjectURL(new Blob([json], {type:'application/json'})), anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'stealth-debug-recording.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
function setTouchActionLabel(button, label) {
  const caption = button.querySelector('.touch-label');
  if (caption) caption.textContent = label;
  else button.textContent = label;
}

function updateTouch(state = latestGameState) {
  perspectiveMenu?.update(fullscreenActive() && !!state?.ready && !state.manual && !loading && !gameMenuOpen, state?.view);
  const orientationReady = !$('viewport').classList.contains('landscape-required') && !$('viewport').classList.contains('fullscreen-required') && !gameMenuOpen && !state?.dialogue_open && !state?.modal_open;
  const overviewEnabled = orientationReady && !!state && !state.manual && !state.inventory_open && state.view === 'overview' && !loading;
  overviewCamera.setEnabled(overviewEnabled);
  $('overview-reset').classList.toggle('hidden', !overviewEnabled);
  const visible = orientationReady && !!state?.manual && mobileTouch && !state.inventory_open && !loading;
  quickbar.setEnabled(visible && !state.paused && !state.completed && !!state.quickbar?.slots);
  $('touch-controls').classList.toggle('hidden', !visible || state.paused || state.completed);
  touch.setEnabled(visible && !state.paused && !state.completed && !quickbar.open);
}
const mb = (n) => (n / 1e6).toFixed(1);
const shellStarted = performance.now();
window.stealthMetrics = {shellStarted, loadedAt: null, readyAt: null, bytesFetched: 0, bytesCached: 0, assetMode: 'parallel', assets: {}, assetsReadyAt: null, phases: {}, sceneStartedAt: null};

function validateSelection(raw) {
  if (!manifest.levels.some((level) => level.id === raw.level)) throw new Error('Choose a listed test level.');
  const seed = Number(raw.seed), budget = Number(raw.budget);
  if (String(raw.seed).trim() === '' || !Number.isInteger(seed) || seed < 0 || seed > 2147483647) throw new Error('Seed must be a whole number from 0 to 2147483647.');
  if (String(raw.budget).trim() === '' || !Number.isInteger(budget) || budget < 30 || budget > 900) throw new Error('Time limit must be a whole number from 30 to 900 seconds.');
  if (!['autonomous', 'manual'].includes(raw.mode)) throw new Error('Choose an autonomous or manual run.');
  const model = 'human';
  return {level:raw.level, seed, budget, mode:raw.mode, model};
}

function selectionFromUI() {
  return validateSelection({level:$('level').value, seed:$('seed').value, budget:$('budget').value, mode:$('mode-control').checked ? 'manual' : 'autonomous', model:$('model')?.value ?? selectedModel});
}

function selectionToUI(selection) {
  $('level').value = selection.level;
  $('seed').value = String(selection.seed);
  $('budget').value = String(selection.budget);
  $('mode-demo').checked = selection.mode === 'autonomous';
  $('mode-control').checked = selection.mode === 'manual';
  selectedModel = 'human';
  if ($('model')) $('model').value = selectedModel;
  modeFields();
}

function modeFields() {
  $('viewport').classList.toggle('manual-control', $('mode-control').checked);
  $('play-toggle').classList.toggle('hidden', $('mode-control').checked);
  $('seed').disabled = loading;
  $('random-seed').disabled = loading;
  $('seed-up').disabled = loading;
  $('seed-down').disabled = loading;
  document.querySelector('.camera-controls').classList.toggle('control-mode', $('mode-control').checked);
}

function showSelection(selection) {
  const level = manifest.levels.find((entry) => entry.id === selection.level);
  $('choose-map').textContent = '‹ Maps';
  $('selection-badge').textContent = `${level.id.toUpperCase()} · ${selection.mode === 'autonomous' ? 'DEMO' : 'CONTROL'} · SEED ${selection.seed}`;
  $('scenario-heading').textContent = level.label.toUpperCase();
  $('level-description').textContent = level.description;
  $('budget-description').textContent = level.lab ? 'Open practice · Replay resets the lab' : `${selection.budget}-second attempt · failure is a valid outcome`;
}

function rememberSelection(selection) {
  const url = new URL(location.href);
  for (const [key,value] of Object.entries(selection)) url.searchParams.set(key, value);
  history.replaceState(null, '', url);
}

function configurationError(error) {
  $('config-help').textContent = error.message;
  $('config-help').classList.add('error');
}

function controlsEnabled(enabled) {
  $('choose-map').disabled = !enabled;
  $('fps-counter').disabled = !enabled;
  debugVisuals.setEnabled(enabled);
  document.querySelectorAll('[data-lighting]').forEach((input) => {input.disabled = !enabled;});
  document.querySelectorAll('[data-command]').forEach((button) => {button.disabled = !enabled;});
  for (const id of ['level', 'model', 'budget']) { if ($(id)) $(id).disabled = !enabled; }
  $('run-mode').disabled = !enabled;
  modeFields();
}

function startingScene() {
  loading = true;
  touch.reset(); updateTouch();
  controlsEnabled(false);
  $('loading').classList.remove('hidden');
  $('load-status').textContent = 'Starting the selected course…';
  $('load-detail').textContent = 'The engine is already loaded. No game download is needed.';
  $('load-progress').value = 0.95;
  startupTimer = setTimeout(() => failLoading(new Error('The selected course did not start. Reload the page to retry.')), 45000);
}

async function prepare() {
  try {
    manifest = await (await originalFetch('build.json', {cache: 'no-cache'})).json();
    const params = new URL(location.href).searchParams;
    let savedWallTexture = '';
    try { savedWallTexture = localStorage.getItem('stealth-wall-texture') || ''; } catch (_) {}
    const requestedWallTexture = params.get('wall_texture') ?? savedWallTexture;
    selectedWallTexture = wallTextureIds.includes(requestedWallTexture) ? requestedWallTexture : 'untextured';
    $('wall-texture').value = selectedWallTexture;
    const defaults = {level:'mk1', seed:manifest.seed, budget:manifest.budget_seconds, mode:'autonomous', model:'human'};
    let initial;
    try { initial = validateSelection(Object.fromEntries(Object.entries(defaults).map(([key,value]) => [key,params.get(key) ?? value]))); }
    catch (error) { initial = defaults; configurationError(error); }
    selectionToUI(initial);
    showSelection(initial);
    const total = Object.values(manifest.assets).reduce((sum, asset) => sum + asset.download_bytes, 0);
    $('download-info').textContent = `${mb(total)} MB first load · replay without another download`;
    $('load').disabled = false;
    await startGame();
  } catch (error) {
    $('download-info').textContent = 'Could not read the build. Reload the page to try again.';
    $('loading').classList.remove('hidden');
    $('load-status').textContent = 'Could not start the game.';
    $('load-detail').textContent = error.message;
  }
}

function failLoading(error) {
  if (!loading) return;
  loading = false;
  clearTimeout(startupTimer);
  $('loading').classList.remove('hidden');
  $('load-status').textContent = 'The demo could not start.';
  $('load-detail').textContent = error?.message || String(error);
  const spinner = document.querySelector('.spinner');
  if (spinner) spinner.style.display = 'none';
  console.error(error);
}

const lightingFormats = {
  ambient: value => `${Number(value).toFixed(2)}×`,
  strength: value => `${Number(value).toFixed(2)}×`,
  reach: value => `${Number(value).toFixed(2)}×`,
  falloff: value => `${Number(value).toFixed(2)}×`
};
window.stealthLightingError = message => {
  const error = $('lighting-error');
  // The tuning UI is optional; keep load failures diagnosable without it.
  if (!error) {
    if (message && loading) failLoading(new Error(message));
    else if (message) console.error(message);
    return;
  }
  error.textContent = message;
  error.classList.toggle('hidden', !message);
  if (message) {
    setFullscreenMenu(true);
    $('lighting-controls').open = true;
    if (loading) failLoading(new Error(message));
  }
};
function updateLightingUI(values) {
  for (const [key, format] of Object.entries(lightingFormats)) {
    const input = document.querySelector(`[data-lighting="${key}"]`);
    if (!input) continue;
    if (input !== document.activeElement) input.value = String(values[key]);
    $(`lighting-${key}-value`).textContent = format(values[key]);
  }
}
document.querySelectorAll('[data-lighting]').forEach(input => input.addEventListener('input', () => {
  const values = Object.fromEntries([...document.querySelectorAll('[data-lighting]')].map(control => [control.dataset.lighting, Number(control.value)]));
  updateLightingUI(values);
  window.stealthControl?.('lighting', JSON.stringify(values));
}));

window.addEventListener('error', (event) => failLoading(event.error || event.message));
window.addEventListener('unhandledrejection', (event) => failLoading(event.reason));

function withTimeout(operation, milliseconds, message) {
  let timer;
  return Promise.race([operation, new Promise((_, reject) => {timer = setTimeout(() => reject(new Error(message)), milliseconds);})]).finally(() => clearTimeout(timer));
}

// Asset durations include cache lookup/fetch, decompression and validation.
// Parallel durations overlap and must not be added to obtain the total.
function updateLoadTimings() {
  const metrics = window.stealthMetrics;
  const asset = label => {
    const timing = metrics.assets[label];
    return timing ? `${(timing.elapsedMs / 1000).toFixed(2)}s (${timing.source})` : 'pending';
  };
  const total = metrics.readyAt && metrics.loadedAt != null ? `${((metrics.readyAt - metrics.loadedAt) / 1000).toFixed(2)}s` : 'loading';
  const phase = name => metrics.phases[name] == null ? 'pending' : `${(metrics.phases[name] / 1000).toFixed(2)}s`;
  const startup = ` · Compile ${phase('compile')} · Godot init ${phase('initialize')} · Scene ready ${phase('scene')}`;
  $('load-timings').textContent = `Engine ${asset('engine')} · Game pack ${asset('course')} · ${metrics.assetMode} · Total ${total}${startup}`;
}
async function measureStartupPhase(name, operation) {
  const started = performance.now();
  try { return await operation(); }
  finally {
    window.stealthMetrics.phases[name] = performance.now() - started;
    updateLoadTimings();
  }
}
async function loadStartupAssets(read = compressedAsset) {
  const assets = await Promise.all([
    withTimeout(read(manifest.assets['game.wasm'], 'engine'), 120000, 'The engine download timed out. Reload to retry.'),
    withTimeout(read(manifest.assets['game.pck'], 'course'), 120000, 'The course download timed out. Reload to retry.')
  ]);
  window.stealthMetrics.assetsReadyAt = performance.now();
  return assets;
}

async function compressedAsset(asset, label) {
  const startedAt = performance.now();
  let cache;
  try { cache = await caches.open('stealth-content-v1'); } catch (_) { /* Private browsers may refuse storage. */ }
  const key = new URL(asset.url, location.href).href;
  let response = cache && await cache.match(key);
  const source = response ? 'cache' : 'fetch';
  if (response) {
    bytesCached += asset.download_bytes;
  } else {
    response = await originalFetch(key);
    if (!response.ok) throw new Error(`Download failed (${response.status}): ${asset.url}`);
    bytesFetched += asset.download_bytes;
  }
  window.stealthMetrics.bytesFetched = bytesFetched;
  window.stealthMetrics.bytesCached = bytesCached;
  $('load-status').textContent = `Downloading ${label}…`;
  const bytes = new Uint8Array(await response.arrayBuffer());
  let buffer;
  try {
    // Some hosts apply HTTP decompression themselves. Inspect the bytes rather
    // than assuming a .gz filename still means a compressed response body.
    buffer = bytes[0] === 0x1f && bytes[1] === 0x8b
      ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
      : bytes.buffer;
    const magic = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
    const signature = label === 'engine' ? [0, 97, 115, 109] : [71, 68, 80, 67];
    if (buffer.byteLength !== asset.raw_bytes || !signature.every((byte, index) => magic[index] === byte)) {
      throw new Error(`The ${label} download is not the expected game file. Reload and sign in again if needed.`);
    }
  } catch (error) {
    if (cache) await cache.delete(key);
    throw error;
  }
  // Cache only after verifying the payload, and never block engine startup on
  // a mobile browser's storage implementation.
  if (cache) cache.put(key, new Response(bytes)).catch(() => {});
  window.stealthMetrics.assets[label] = {elapsedMs: performance.now() - startedAt, source};
  updateLoadTimings();
  return buffer;
}

window.stealthReport = (json) => {
  const state = JSON.parse(json);
  latestGameState = state;
  $('viewport').classList.toggle('dialogue-open', !!state.dialogue_open || !!state.modal_open);
  if (state.menu_ready) {
    gameMenuOpen = true;
    touch.reset(); overviewCamera.reset(); quickbar.setEnabled(false);
    loading = false; clearTimeout(startupTimer);
    $('loading').classList.add('hidden'); $('launch').classList.add('hidden');
    $('viewport').classList.add('live'); $('viewport').classList.add('game-menu-open');
    syncFullscreen();
    setFullscreenMenu(false); controlsEnabled(false);
    if (!window.stealthMetrics.readyAt) {
      window.stealthMetrics.readyAt = performance.now();
      window.stealthMetrics.phases.scene = window.stealthMetrics.readyAt - window.stealthMetrics.sceneStartedAt;
      updateLoadTimings();
      $('cache-note').textContent = `${mb(bytesFetched)} MB fetched; ${mb(bytesCached)} MB reused from cache. Map changes need no engine download.`;
    }
    if (!audioSent) updateAudio();
    window.stealthState = state; updateTouch(state);
    return;
  }
  if (!state.ready) return;
  if (gameMenuOpen) controlsEnabled(true);
  gameMenuOpen = false;
  $('viewport').classList.remove('game-menu-open');
  const accepted = JSON.stringify(state.selection);
  if (state.selection && accepted !== acceptedRunSelection) {
    acceptedRunSelection = accepted;
    selectionToUI(state.selection); rememberSelection(state.selection);
  }
  quickbar.update(state.quickbar);
  document.querySelector('[data-touch-action="grenade"]')?.classList.toggle('hidden', !(state.grenade?.count > 0));
  document.querySelector('[data-touch-action="grenade_cancel"]')?.classList.toggle('hidden', !state.grenade?.aiming);
  if (mobileTouch && state.quickbar && !state.quickbar.external_touch) window.stealthControl?.('quickbar', JSON.stringify({touch_host:true}));
  $('inventory-open')?.classList.toggle('hidden', !state.inventory_available || !!state.inventory_open);
  document.querySelectorAll('[data-lab]').forEach(button => {
    button.classList.toggle('hidden', !button.dataset.lab.split(' ').includes(state.lab));
    if (button.dataset.touchAction === 'attack') setTouchActionLabel(button, state.lab === 'weapons' ? 'Fire' : 'Punch');
  });
  const armed = !!state.weapon?.equipped && !!state.weapon?.drawn;
  const fire = document.querySelector('[data-touch-action="attack"]');
  const reload = document.querySelector('[data-lab-action="reload"]');
  if (!state.lab || state.lab === 'weapons') {
    fire?.classList.toggle('hidden', !armed);
    reload?.classList.toggle('hidden', !armed);
    if (fire) setTouchActionLabel(fire, state.weapon?.kind === 'melee' ? 'Strike' : 'Fire');
    reload?.classList.toggle('hidden', !armed || state.weapon?.kind === 'melee');
  }
  $('wall-texture').disabled = !!state.lab;
  $('budget').disabled = !!state.lab;
  if (state.ready && !wallTextureApplied) {
    wallTextureApplied = true;
    const initialTexture = selectedWallTexture;
    pendingWallTexture = initialTexture;
    setTimeout(() => window.stealthControl?.('wall_texture', JSON.stringify({id:initialTexture})), 0);
  } else if (wallTextureApplied && wallTextureIds.includes(state.wall_texture) && $('wall-texture') !== document.activeElement) {
    // An old report can arrive between sending a choice and its acknowledgement.
    // Keep the requested choice until the engine reports that exact material.
    if (pendingWallTexture === null || state.wall_texture === pendingWallTexture) {
      pendingWallTexture = null;
      selectedWallTexture = state.wall_texture;
      $('wall-texture').value = selectedWallTexture;
    }
  }
  if (!audioSent) updateAudio();
  debugVisuals.update(state.debug_visuals);
  if (state.lighting) updateLightingUI(state.lighting);
  recordingInspector.ready();
  if (loading) {
    loading = false;
    clearTimeout(startupTimer);
    $('loading').classList.add('hidden');
    controlsEnabled(true);
    if (state.selection) {
      selectionToUI(state.selection);
      $('config-help').textContent = 'Demo and Control switch live. Level changes restart immediately; seed/time limit apply on Enter or leaving the field.';
      $('config-help').classList.remove('error');
    }
  }
  if (!window.stealthMetrics.readyAt) {
    window.stealthMetrics.readyAt = performance.now();
    if (window.stealthMetrics.sceneStartedAt != null) {
      window.stealthMetrics.phases.scene = window.stealthMetrics.readyAt - window.stealthMetrics.sceneStartedAt;
    }
    updateLoadTimings();
    $('loading').classList.add('hidden');
    $('live')?.classList.remove('hidden');
    $('viewport').classList.add('live');
    syncFullscreen();
    controlsEnabled(true);
    $('cache-note').textContent = `${mb(bytesFetched)} MB fetched; ${mb(bytesCached)} MB reused from cache. Replays need no game download.`;
  }
  if (state.selection) showSelection(state.selection);
  if (state.selection) {
    $('mode-demo').checked = state.selection.mode === 'autonomous';
    $('mode-control').checked = state.selection.mode === 'manual';
    modeFields();
  }
  $('elapsed').innerHTML = `${state.elapsed.toFixed(1)}<em>s</em>`;
  $('unseen').innerHTML = `${state.unseen.toFixed(1)}<em>%</em>`;
  $('seen').textContent = `${state.seen.toFixed(1)}s seen by guards`;
  $('stamina').innerHTML = `${Math.round(state.stamina * 100)}<em>%</em>`;
  $('posture').textContent = `${state.posture} · ${state.retreats} retreats`;
  $('hearing').textContent = state.hearing;
  $('status').textContent = `${state.state} / ${state.goal}`;
  syncFullscreenControls?.();
  const q = state.query_stats;
  if (q) {
    $('query-frame').textContent = `${q.window_index_p95_ms_per_frame.toFixed(3)} ms / ${q.frame_budget_ms} ms budget`;
    $('query-latency').textContent = `${q.query_p95_us} µs`;
    $('query-candidates').textContent = `${q.candidates_per_query.toFixed(1)} / ${(q.queries ? q.linear_candidates / q.queries : 0).toFixed(1)} (${(q.candidate_fraction * 100).toFixed(1)}%)`;
    $('query-cells').textContent = `${q.cells_per_query.toFixed(1)} · ${(q.empty_cell_fraction * 100).toFixed(0)}% empty`;
    $('query-buckets').textContent = `${q.mean_bucket_occupancy.toFixed(1)} mean / ${q.max_bucket_occupancy} max`;
    $('query-updates').textContent = `${q.window_update_ms_per_frame.toFixed(3)} ms`;
    $('query-population').textContent = `${q.entities} / ${q.oversized_entities} / ${q.fallback_queries}`;
    $('query-alternative').textContent = `${q.window_alternative_budget_us_per_query.toFixed(1)} µs / query, including maintenance`;
    $('download-query-stats').disabled = false;
  }
  const playToggle = $('play-toggle');
  playToggle.textContent = state.paused ? '▶' : 'Ⅱ';
  playToggle.setAttribute('aria-label', state.paused ? 'Play simulation' : 'Pause simulation');
  playToggle.title = state.paused ? 'Play simulation' : 'Pause simulation';
  $('interaction-prompt').textContent = state.interaction || '';
  if ($('mode-label')) $('mode-label').textContent = state.completed ? state.state.toUpperCase() : (state.manual ? 'CONTROL' : 'DEMO');
  document.querySelectorAll('.camera-controls button').forEach((button) => button.classList.toggle('selected', button.dataset.command === state.view));
  const playerUiVisible = !!state.player_ui_visible;
  for (const button of [$('game-ui-toggle'), $('fullscreen-game-ui-toggle')].filter(Boolean)) {
    button.classList.toggle('hidden', state.view === 'first_person');
    button.textContent = playerUiVisible ? 'Hide UI' : 'Show UI';
    button.setAttribute('aria-pressed', String(playerUiVisible));
    button.setAttribute('aria-label', playerUiVisible ? 'Hide game UI' : 'Show game UI');
    button.title = playerUiVisible ? 'Hide game UI' : 'Show game UI';
  }
  window.stealthState = state;
  updateTouch(state);

};

$('download-query-stats').addEventListener('click', () => {
  const state = latestGameState;
  if (!state?.query_stats) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify({selection:state.selection, elapsed:state.elapsed, query_stats:state.query_stats}, null, 2)], {type:'application/json'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = `spatial-${state.selection.level}-seed${state.selection.seed}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

async function startGame() {
  if (!manifest || loading) return;
  let selected;
  try { selected = selectionFromUI(); rememberSelection(selected); }
  catch (error) { configurationError(error); return; }
  window.stealthMetrics.loadedAt = performance.now();
  loading = true;
  controlsEnabled(false);
  startupTimer = setTimeout(() => failLoading(new Error('Startup timed out. Reload this page to retry; downloaded files remain cached.')), 180000);
  $('launch').classList.add('hidden');
  $('loading').classList.remove('hidden');
  try {
    if (!window.DecompressionStream) throw new Error('This browser needs an update to load the compressed demo.');
    const script = document.createElement('script');
    script.src = manifest.assets['game.js'].url;
    const scriptReady = new Promise((resolve, reject) => {script.onload = resolve; script.onerror = reject;});
    document.head.appendChild(script);
    await withTimeout(scriptReady, 30000, 'The engine loader did not download. Reload the page to retry.');
    const probe = document.createElement('canvas');
    if (!probe.getContext('webgl2')) throw new Error('WebGL 2 is unavailable. Try a browser with hardware acceleration enabled.');
    $('load-status').textContent = 'Preparing engine and game pack in parallel…';
    const [wasm, pack] = await loadStartupAssets();
    $('load-progress').value = 0.9;
    $('load-status').textContent = 'Compiling the engine…';
    // Compile explicitly so a WebAssembly/CSP/device error reaches the page,
    // rather than disappearing inside Godot's streaming-instantiation promise.
    await measureStartupPhase('compile', () => withTimeout(WebAssembly.compile(wasm), 45000, 'This device took too long to compile the engine. Try another browser.'));
    await measureStartupPhase('initialize', async () => {
    engine = new Engine({executable: 'game', mainPack: 'game.pck', canvas: $('canvas'), canvasResizePolicy: 0, focusCanvas: false,
      persistentPaths: [], args: ['--disable-input-server'],
      fileSizes: {'game.wasm': manifest.assets['game.wasm'].raw_bytes, 'game.pck': manifest.assets['game.pck'].raw_bytes},
      onProgress: (current, total) => {
        $('load-progress').value = total ? current / total : 0;
        $('load-status').textContent = total && current >= total ? 'Starting the simulation…' : 'Loading the engine and course…';
        $('load-detail').textContent = `${mb(bytesFetched)} MB fetched · ${mb(bytesCached)} MB from cache`;
      }, onPrint: (...args) => console.log(...args), onPrintError: (...args) => {
        console.error(...args);
        if (loading && args.some((value) => /SCRIPT ERROR|Parse Error/.test(String(value)))) failLoading(new Error(args.join(' ')));
      },
      onExit: (code) => {failLoading(new Error(`The engine stopped during startup (code ${code}).`)); $('status').textContent = 'Simulation stopped. Reload to start again.';}});
    Engine.loadFromBuffer('game', wasm);
    await engine.preloadFile(pack, 'game.pck');
    await withTimeout(engine.init(), 45000, 'The engine could not initialize. Reload or try another browser.');
    });
    $('load-status').textContent = 'Starting the simulation…';
    const args = ['--main-pack', 'game.pck', '--', '--disable-input-server', ...Object.entries(selected).map(([key,value]) => `--demo-${key}=${value}`)];
    window.stealthMetrics.sceneStartedAt = performance.now();
    await engine.start({args});
  } catch (error) {
    failLoading(error);
  }
}

$('load').addEventListener('click', startGame);
$('choose-map').addEventListener('click', () => {
  if (!loading) { touch.reset(); setFullscreenMenu(false); window.stealthControl?.('menu'); }
});

document.querySelectorAll('[data-command]').forEach((button) => button.addEventListener('click', () => {
  if ('perspective' in button.dataset) return;
  if (window.stealthControl) {
    touch.reset();
    if (button.dataset.command === 'play') {
      $('mode-demo').checked = false;
      $('mode-control').checked = true;
      applyMode();
      return;
    }
    if (button.dataset.command === 'restart') startingScene();
    window.stealthControl(button.dataset.command);
  }
}));
function applyParameters() {
  if (!manifest || loading) return;
  try {
    const selected = selectionFromUI();
    if (latestGameState?.selection && Object.entries(selected).every(([key,value]) => latestGameState.selection[key] === value)) return;
    rememberSelection(selected);
    showSelection(selected);
    modeFields();
    $('config-help').classList.remove('error');
    if (window.stealthControl) {
      startingScene();
      window.stealthControl('configure', JSON.stringify(selected));
    }
  } catch (error) { configurationError(error); }
}
function applyMode() {
  touch.reset();
  try {
    const selected = selectionFromUI();
    rememberSelection(selected);
    showSelection(selected);
    modeFields();
    if (window.stealthControl) window.stealthControl('mode', JSON.stringify({mode:selected.mode}));
  } catch (error) { configurationError(error); }
}
$('wall-texture').addEventListener('change', () => {
  const id = $('wall-texture').value;
  if (!wallTextureIds.includes(id)) {
    $('config-help').textContent = 'Choose one of the available wall materials.';
    $('config-help').classList.add('error');
    $('wall-texture').value = selectedWallTexture;
    return;
  }
  selectedWallTexture = id;
  try { localStorage.setItem('stealth-wall-texture', id); } catch (_) {}
  const url = new URL(location.href);
  url.searchParams.set('wall_texture', id);
  history.replaceState(null, '', url);
  $('config-help').textContent = 'Wall texture applied live; it does not change stealth visibility.';
  $('config-help').classList.remove('error');
  if (window.stealthControl && latestGameState?.ready) {
    pendingWallTexture = id;
    window.stealthControl('wall_texture', JSON.stringify({id}));
    wallTextureApplied = true;
  }
});
$('random-seed').addEventListener('click', () => {
  $('seed').value = String(crypto.getRandomValues(new Uint32Array(1))[0] & 0x7fffffff);
  applyParameters();
});
for (const [id, direction] of [['seed-up', 1], ['seed-down', -1]]) {
  // Do not commit an old edit via blur before this explicit button action.
  $(id).addEventListener('pointerdown', event => event.preventDefault());
  $(id).addEventListener('click', () => {
    const value = Number($('seed').value);
    if (!Number.isInteger(value)) return;
    $('seed').value = String(Math.min(2147483647, Math.max(0, value + direction)));
    applyParameters();
  });
}
for (const id of ['level', 'model']) $(id)?.addEventListener('change', applyParameters);
for (const id of ['mode-demo', 'mode-control']) $(id).addEventListener('change', applyMode);
// Number edits are a transaction: commit on blur, including Enter-to-blur.
// Do not use change: number steppers can emit it while the field is focused.
for (const id of ['seed', 'budget']) {
  $(id).addEventListener('blur', applyParameters);
  $(id).addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.currentTarget.blur();
  });
}
function togglePlayerUi() {
  if (!latestGameState || latestGameState.view === 'first_person') return;
  const visible = !latestGameState.player_ui_visible;
  window.stealthControl?.('player_ui', JSON.stringify({visible}));
}
$('game-ui-toggle')?.addEventListener('click', togglePlayerUi);
$('fullscreen-game-ui-toggle').addEventListener('click', togglePlayerUi);
$('canvas').addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'touch' && window.stealthState?.manual && !loading) {
    $('canvas').focus({preventScroll:true}); window.stealthControl?.('capture_mouse');
  }
});
let fullscreenOverflow;
let landscapeLockOwned = false, landscapeLockGeneration = 0, fullscreenEntryPending = false;
function nativeFullscreen() {
  return document.fullscreenElement || document.webkitFullscreenElement;
}
function fullscreenActive() {
  return nativeFullscreen() === $('viewport') || $('viewport').classList.contains('expanded');
}
function releaseLandscapeLock() {
  landscapeLockGeneration++;
  if (landscapeLockOwned) {
    try { window.screen?.orientation?.unlock?.(); } catch (_) {}
    landscapeLockOwned = false;
  }
}
async function lockLandscape() {
  if (!mobileTouch || !fullscreenActive() || landscapeLockOwned) return;
  const orientation = window.screen?.orientation;
  if (!orientation?.lock) return;
  const generation = ++landscapeLockGeneration;
  try {
    await orientation.lock('landscape');
    if (generation !== landscapeLockGeneration || !fullscreenActive()) orientation.unlock?.();
    else landscapeLockOwned = true;
  } catch (_) { /* Unsupported/denied: the rotate prompt replaces portrait play. */ }
}
function syncFullscreen() {
  overviewCamera.reset();
  const active = nativeFullscreen() === $('viewport') || $('viewport').classList.contains('expanded');
  if (!active) releaseLandscapeLock();
  const rotate = active && mobileTouch && window.matchMedia('(orientation: portrait)').matches;
  const fullscreenRequired = mobileTouch && $('viewport').classList.contains('live') && !active;
  $('viewport').classList.toggle('landscape-required', rotate);
  $('viewport').classList.toggle('fullscreen-required', fullscreenRequired);
  const playPrompt = $('mobile-play-prompt');
  playPrompt.classList.toggle('hidden', !fullscreenRequired && !rotate);
  playPrompt.querySelector('strong').textContent = rotate ? 'Landscape required' : 'Full screen required';
  playPrompt.querySelector('p').textContent = rotate
    ? 'Rotate your phone sideways to continue.'
    : 'Tap the full-screen button to switch to landscape.';
  $('fullscreen').textContent = active ? '⤢' : '⛶';
  $('fullscreen').setAttribute('aria-label', active ? 'Exit full screen' : 'Enter full screen');
  $('fullscreen').title = active ? 'Exit full screen' : 'Enter full screen';
  $('fullscreen').setAttribute('aria-pressed', String(active));
  if (active && fullscreenOverflow === undefined) {
    fullscreenOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  } else if (!active && fullscreenOverflow !== undefined) {
    document.body.style.overflow = fullscreenOverflow;
    fullscreenOverflow = undefined;
  }
  updateTouch();
}
async function exitGameFullscreen() {
  releaseLandscapeLock();
  touch.reset();
  $('viewport').classList.remove('expanded');
  try {
    if (nativeFullscreen()) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  } catch (_) {}
  syncFullscreen();
}
async function enterGameFullscreen() {
  if (fullscreenEntryPending) return;
  fullscreenEntryPending = true;
  touch.reset();
  const viewport = $('viewport');
  try {
    if (!nativeFullscreen()) {
      const request = viewport.requestFullscreen || viewport.webkitRequestFullscreen;
      if (request) await request.call(viewport, {navigationUI:'hide'});
      else viewport.classList.add('expanded');
    }
    if (nativeFullscreen() === viewport) viewport.classList.remove('expanded');
  } catch (_) {
    // Embedded/mobile browsers may deny fullscreen; retain a page-filling option.
    if (!nativeFullscreen()) viewport.classList.add('expanded');
  }
  fullscreenEntryPending = false;
  await lockLandscape();
  syncFullscreen();
}
async function toggleFullscreen() {
  if (fullscreenActive()) await exitGameFullscreen();
  else await enterGameFullscreen();
  syncFullscreen();
}
$('fullscreen').addEventListener('click', toggleFullscreen);
const fullscreenMenu = $('fullscreen-menu');
function setFullscreenMenu(open) {
  if (open) perspectiveMenu?.close();
  fullscreenMenu.classList.toggle('hidden', !open);
  $('fullscreen-menu-toggle').setAttribute('aria-expanded', String(open));
  $('fullscreen-menu-toggle').textContent = open ? 'Close options' : 'Options';
}
$('options-close').addEventListener('click', () => setFullscreenMenu(false));
$('fullscreen-menu-toggle').addEventListener('click', () => setFullscreenMenu(fullscreenMenu.classList.contains('hidden')));
$('fullscreen-menu-debug')?.addEventListener('click', () => $('debug-view-toggle').click());
$('fullscreen-menu-performance')?.addEventListener('click', () => $('fps-counter').click());
$('fullscreen-menu-lighting')?.addEventListener('click', () => {
  setFullscreenMenu(true);
  $('lighting-controls').open = !$('lighting-controls').open;
  $('lighting-controls').scrollIntoView({block:'nearest'});
});
function syncFullscreenControls() {
  if ($('fullscreen-mode')) $('fullscreen-mode').textContent = $('mode-control').checked ? 'CONTROL' : 'DEMO';
  if ($('fullscreen-status')) $('fullscreen-status').textContent = $('status').textContent || 'Simulation ready';
  $('fullscreen-mute').setAttribute('aria-pressed', String(audioMuted));
  $('fullscreen-mute').textContent = audioMuted ? '♪̸' : '♫';
  if ($('fullscreen-menu-debug')) $('fullscreen-menu-debug').textContent = $('debug-view-panel').classList.contains('hidden') ? 'Debug view' : 'Close debug view';
  if ($('fullscreen-menu-performance')) $('fullscreen-menu-performance').textContent = $('performance-panel').classList.contains('hidden') ? 'Performance' : 'Close performance';
}
$('fullscreen-mute').addEventListener('click', () => $('mute').click());
for (const eventName of ['click','change','input']) document.addEventListener(eventName, event => {
  if (event.target.closest?.('.fullscreen-chrome, #viewport')) syncFullscreenControls();
});
const originalSyncFullscreen = syncFullscreen;
syncFullscreen = function() {
  originalSyncFullscreen();
  syncFullscreenControls();
  $('fullscreen-menu-toggle').setAttribute('aria-expanded', String(!fullscreenMenu.classList.contains('hidden')));
};
syncFullscreen();
for (const event of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(event, () => {touch.reset(); syncFullscreen();});
window.addEventListener('resize', syncFullscreen);
window.addEventListener('orientationchange', syncFullscreen);
window.matchMedia('(orientation: portrait)').addEventListener?.('change', syncFullscreen);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && $('viewport').classList.contains('expanded')) {
    exitGameFullscreen();
  }
});

// Optional lab capabilities use the same session input channel as their desktop keys.
for (const button of document.querySelectorAll('[data-lab-action]')) {
  const release = () => window.stealthControl?.('action', JSON.stringify({name:button.dataset.labAction, pressed:false}));
  button.addEventListener('pointerdown', event => {
    if (!latestGameState?.manual || latestGameState.paused) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    window.stealthControl?.('action', JSON.stringify({name:button.dataset.labAction, pressed:true}));
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, release);
}

for (const type of ['keydown', 'keyup']) window.addEventListener(type, event => {
  if (event.code === 'KeyR' && latestGameState?.manual && latestGameState.lab === 'combat' && !event.repeat) {
    event.preventDefault();
    window.stealthControl?.('heavy_key', JSON.stringify({pressed:type === 'keydown'}));
  }
});

prepare();
