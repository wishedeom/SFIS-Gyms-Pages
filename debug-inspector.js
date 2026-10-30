/* Generic presenter for imsim.debug streams. No gameplay or stealth calculations. */
(function (global) {
  'use strict';
  function plotPoints(points, metric, first, last, width, height) {
    const span = Math.max(0.1, last - first), range = Math.max(0.001, metric.max - metric.min);
    return points.map(([time, value]) => value === null ? null : [
      40 + (time - first) / span * (width - 54),
      25 + (1 - Math.max(0, Math.min(1, (value - metric.min) / range))) * (height - 50)
    ]);
  }
  function mapProjection(entities, solids, width, height) {
    const xs = [], zs = [];
    for (const entity of entities) { if (Array.isArray(entity.position)) { xs.push(entity.position[0]); zs.push(entity.position[2]); } }
    for (const solid of solids) {
      xs.push(solid.position[0] - solid.size[0] / 2, solid.position[0] + solid.size[0] / 2);
      zs.push(solid.position[1] - solid.size[1] / 2, solid.position[1] + solid.size[1] / 2);
    }
    const minX = xs.length ? Math.min(...xs) - 3 : -10, maxX = xs.length ? Math.max(...xs) + 3 : 10;
    const minZ = zs.length ? Math.min(...zs) - 3 : -10, maxZ = zs.length ? Math.max(...zs) + 3 : 10;
    const scale = Math.min((width - 32) / Math.max(1, maxX - minX), (height - 32) / Math.max(1, maxZ - minZ));
    return {scale, point: (x, z) => [width / 2 + (x - (minX + maxX) / 2) * scale, height / 2 + (z - (minZ + maxZ) / 2) * scale]};
  }
  class RecordingInspector {
    constructor(document, send) {
      this.document = document; this.send = packet => {this.error('');send(packet);}; this.state = null; this.charts = new Map();
      this.el = id => document.getElementById(id);
      this.editingSelectors = new Set(); this.pendingOptions = new Map();
      this.el('debug-inspector').addEventListener('toggle', () => {
        this.send({action:'open', open:this.el('debug-inspector').open});
        if (this.el('debug-inspector').open && global.stealthState && !global.stealthState.paused) this.send({action:'pause'});
      });
      for (const [id, action, extra] of [['pause','pause'], ['back','step',{direction:-1}], ['next','step',{direction:1}], ['live','live'], ['export','export']]) {
        this.el(`debug-${id}`).addEventListener('click', () => this.send({action, ...extra}));
      }
      for (const id of ['source','target','stream']) {
        const key = `debug-${id}`, select = this.el(key);
        // Mobile pickers can change .value before dispatching change on Done.
        // Telemetry must not reset that tentative value or replace its options.
        for (const event of ['pointerdown','focus']) select.addEventListener(event, () => this.editingSelectors.add(key));
        select.addEventListener('keydown', event => {
          if (['ArrowUp','ArrowDown','Home','End',' ','Enter'].includes(event.key)) this.editingSelectors.add(key);
          if (event.key === 'Escape') {
            this.editingSelectors.delete(key);
            const pending = this.pendingOptions.get(key);
            if (pending) this.options(key, pending.choices, pending.selected);
          }
        });
        select.addEventListener('change', () => {
          const chosen = select.value;
          this.editingSelectors.delete(key); this.pendingOptions.delete(key);
          this.send({action:'select', [id]:chosen});
        });
        select.addEventListener('blur', () => {
          // A picker may blur before its final change event. Let that event finish.
          setTimeout(() => {
            if (this.document.activeElement === select) return;
            this.editingSelectors.delete(key);
            const pending = this.pendingOptions.get(key);
            if (pending) this.options(key, pending.choices, pending.selected);
          }, 0);
        });
      }
      this.el('debug-cursor').addEventListener('input', () => this.send({action:'seek', time:Number(this.el('debug-cursor').value)}));
      this.el('debug-import').addEventListener('click', () => this.el('debug-file').click());
      this.el('debug-file').addEventListener('change', async () => {
        const file = this.el('debug-file').files[0];
        if (!file) return;
        if (file.size > 32 * 1024 * 1024) { this.error('Recording exceeds the 32 MB import limit.'); return; }
        try { this.send({action:'import', data:await file.text()}); } catch (error) { this.error(error.message); }
        this.el('debug-file').value = '';
      });
      this.el('debug-map').addEventListener('pointerdown', event => this.pick(event));
    }
    ready() {
      for (const id of ['pause','back','next','live','export','import']) this.el(`debug-${id}`).disabled = false;
      if (!this.initialized) {
        this.initialized = true;
        if (this.el('debug-inspector').open) setTimeout(() => this.send({action:'open', open:true}), 0);
      }
    }
    error(message) { this.localError = message; this.el('debug-error').textContent = message; }
    options(id, choices, selected) {
      // Only display identity/label changes require replacing native options.
      // Poses, timestamps and other recording metadata are not option identities.
      choices = choices.map(({id,label}) => ({id,label}));
      this.pendingOptions.set(id, {choices,selected});
      if (this.editingSelectors.has(id)) return;
      const select = this.el(id), signature = JSON.stringify(choices);
      if (select.dataset.options !== signature) {
        select.replaceChildren();
        for (const item of choices) {
          const option = this.document.createElement('option'); option.value = item.id; option.textContent = item.label;
          select.appendChild(option);
        }
        select.dataset.options = signature;
      }
      if (select.value !== selected) select.value = selected;
      select.disabled = choices.length < 2;
      select.title = choices.length === 1 ? (id === 'debug-stream' ? 'Only one recorded system is available: ' : 'Only one option is available: ') + choices[0].label : '';
    }
    update(state) {
      this.state = state;
      this.el('debug-status').textContent = `${state.paused ? 'PAUSED' : 'RECORDING'} · ${state.live ? 'LATEST' : 'HISTORY'} · ${state.count}/${state.capacity} samples · capture ${state.capture_us}µs (peak ${state.peak_capture_us}µs) · ${state.imported ? 'Imported recording; resume starts a new history.' : 'Scrubbing does not rewind the simulation.'}`;
      this.el('debug-pause').textContent = state.paused ? 'Resume simulation' : 'Pause simulation';
      this.el('debug-time').textContent = `${state.time.toFixed(2)}s / ${state.newest.toFixed(2)}s`;
      const cursor = this.el('debug-cursor'); cursor.min = state.oldest; cursor.max = Math.max(state.oldest + 0.001, state.newest); cursor.value = state.time;
      this.options('debug-stream', state.streams.map(id => ({id,label:id === state.stream ? state.schema.label || id : id})), state.stream);
      this.el('debug-source-heading').textContent = (state.schema.source_label || 'Source').toUpperCase();
      this.el('debug-target-heading').textContent = (state.schema.target_label || 'Target').toUpperCase();
      const choices = state.choices || state.entities;
      this.options('debug-source', choices.filter(e => e.source), state.source);
      this.options('debug-target', choices.filter(e => e.target && e.id !== state.source), state.target);
      const row = state.row || {}, details = row.details || {}, lines = [state.source + ' → ' + state.target, `Recorded at ${state.time.toFixed(2)}s`, ''];
      for (const [key, value] of Object.entries(row.values || {})) lines.push(`${key}: ${Number(value).toFixed(3)}`);
      lines.push('', ...Object.entries(details).map(([key,value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`));
      for (const id of [state.source,state.target]) {
        const entity = state.entities.find(e => e.id === id);
        if (entity) lines.push('', `${entity.label} pose:`, ...Object.entries(entity).filter(([key]) => !['id','label','source','target'].includes(key)).map(([key,value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`));
      }
      if (!row.values) lines.push('Pair absent or ambiguous at this time. Graph gaps mean unavailable data.');
      this.el('debug-values').textContent = lines.join('\n');
      this.el('debug-description').textContent = state.schema.description || '';
      this.error(state.error || this.localError || '');
      const events = this.el('debug-events'); events.replaceChildren();
      for (const event of state.events) {
        const item = this.document.createElement('li'), button = this.document.createElement('button');
        button.textContent = `${event.time.toFixed(2)}s · ${event.from} → ${event.to}`;
        button.addEventListener('click', () => this.send({action:'seek',time:event.time}));
        item.appendChild(button); events.appendChild(item);
      }
      const graphRoot = this.el('debug-graphs'), active = new Set();
      for (const series of state.series) {
        active.add(series.metric.key);
        let canvas = this.charts.get(series.metric.key);
        if (!canvas) {
          canvas = this.document.createElement('canvas'); canvas.width = 520; canvas.height = 170;
          canvas.setAttribute('aria-label', series.metric.label + ' history; tap to scrub');
          canvas.addEventListener('pointerdown', event => {
            const box = canvas.getBoundingClientRect(), x = (event.clientX - box.left) / box.width * canvas.width;
            this.send({action:'seek',time:this.state.oldest + Math.max(0,Math.min(1,(x-40)/(canvas.width-54))) * (this.state.newest-this.state.oldest)});
          });
          this.charts.set(series.metric.key, canvas); graphRoot.appendChild(canvas);
        }
        this.drawGraph(canvas, series);
      }
      for (const [key,canvas] of this.charts) if (!active.has(key)) {canvas.remove(); this.charts.delete(key);}
      this.drawMap();
    }
    drawGraph(canvas, series) {
      const ctx = canvas.getContext('2d'), {width,height} = canvas, state = this.state, metric = series.metric;
      ctx.fillStyle = '#111e25'; ctx.fillRect(0,0,width,height); ctx.font = '14px system-ui'; ctx.fillStyle = '#' + metric.color;
      ctx.fillText(metric.label, 12, 17); ctx.lineWidth = 1;
      for (const fraction of [0,0.5,1]) {
        const y = 25 + (1-fraction)*(height-50); ctx.strokeStyle = '#304048'; ctx.beginPath();ctx.moveTo(40,y);ctx.lineTo(width-14,y);ctx.stroke();
        ctx.fillStyle = '#a7b7be'; ctx.fillText((metric.min+(metric.max-metric.min)*fraction).toFixed(metric.max > 10 ? 0 : 1),3,y+4);
      }
      ctx.strokeStyle = '#' + metric.color; ctx.lineWidth = 2; ctx.beginPath(); let pen = false;
      for (const point of plotPoints(series.points,metric,state.oldest,state.newest,width,height)) {
        if (!point) {pen = false;continue;} if (pen) ctx.lineTo(...point); else ctx.moveTo(...point); pen = true;
      }
      ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
      const x = 40 + (state.time-state.oldest)/Math.max(0.1,state.newest-state.oldest)*(width-54);
      ctx.beginPath();ctx.moveTo(x,25);ctx.lineTo(x,height-25);ctx.stroke();
      ctx.fillStyle = '#a7b7be';ctx.fillText(state.oldest.toFixed(1)+'s',40,height-5);ctx.fillText(state.newest.toFixed(1)+'s',width-66,height-5);
    }
    drawMap() {
      const state = this.state, canvas = this.el('debug-map'), ctx = canvas.getContext('2d'), solids = state.schema.map?.solids || [], entities = state.entities.filter(e => Array.isArray(e.position));
      const projection = mapProjection(entities,solids,canvas.width,canvas.height); this.projection = projection;
      ctx.fillStyle = '#111e25';ctx.fillRect(0,0,canvas.width,canvas.height);
      for (const solid of solids) {
        const [x,y] = projection.point(solid.position[0]-solid.size[0]/2,solid.position[1]-solid.size[1]/2);
        ctx.fillStyle = '#2a3a43';ctx.fillRect(x,y,solid.size[0]*projection.scale,solid.size[1]*projection.scale);
      }
      const observer = entities.find(e => e.id === state.source);
      for (const marker of state.row?.markers || []) {
        if (!observer) continue;
        const remembered = marker.position;
        const a = projection.point(observer.position[0],observer.position[2]), b = projection.point(remembered[0],remembered[2]);
        ctx.strokeStyle = '#ffb454';ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();ctx.setLineDash([]);
        if (marker.kind === 'silhouette') {
          ctx.fillStyle = 'rgba(255,180,84,0.25)'; ctx.fillRect(b[0]-5,b[1]-4,10,10);
          ctx.beginPath();ctx.arc(b[0],b[1]-9,3.5,0,Math.PI*2);ctx.stroke();
          ctx.strokeRect(b[0]-5,b[1]-4,10,10);ctx.fillStyle='#ffb454';ctx.fillText('Last seen',b[0]+8,b[1]+14);
        } else ctx.strokeRect(b[0]-5,b[1]-5,10,10);
      }
      ctx.font = '12px system-ui';
      for (const entity of entities) {
        const [x,y] = projection.point(entity.position[0],entity.position[2]);
        ctx.fillStyle = entity.id === state.source ? '#ffb454' : entity.id === state.target ? '#70dfce' : '#b0bfc7';
        ctx.beginPath();ctx.arc(x,y,entity.id === state.source || entity.id === state.target ? 6 : 4,0,Math.PI*2);ctx.fill();
        const facing = entity.facing || [0,0,0];
        ctx.strokeStyle = ctx.fillStyle;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+facing[0]*14,y+facing[2]*14);ctx.stroke();
        ctx.fillText(entity.label,x+8,y-7);
      }
    }
    pick(event) {
      if (!this.state || !this.projection) return;
      const canvas = this.el('debug-map'), rect = canvas.getBoundingClientRect();
      const x = (event.clientX-rect.left)/rect.width*canvas.width, y = (event.clientY-rect.top)/rect.height*canvas.height;
      const nearest = this.state.entities.filter(e => Array.isArray(e.position)).map(entity => ({entity, p:this.projection.point(entity.position[0],entity.position[2])}))
        .sort((a,b) => Math.hypot(a.p[0]-x,a.p[1]-y)-Math.hypot(b.p[0]-x,b.p[1]-y))[0];
      if (!nearest || Math.hypot(nearest.p[0]-x,nearest.p[1]-y)>24) return;
      const field = event.shiftKey || !nearest.entity.source ? 'target' : 'source';
      this.send({action:'select',[field]:nearest.entity.id});
    }
  }
  global.DebugCharts = {plotPoints,mapProjection}; global.RecordingInspector = RecordingInspector;
})(globalThis);
