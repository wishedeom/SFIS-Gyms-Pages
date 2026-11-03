/* Engine-frame telemetry only; no browser animation-loop FPS estimate. */
window.PerformancePanel = class {
  constructor(doc, send, releaseInput, options = {}) {
    this.doc = doc; this.send = send; this.releaseInput = releaseInput;
    this.button = doc.getElementById('fps-counter');
    this.panel = doc.getElementById('performance-panel');
    this.canvas = doc.getElementById('performance-graph');
    this.open = false;
    this.fps = 0;
    this.mobile = !!options.mobile;
    this.desiredScale = 0.5;
    this.desiredShadows = !this.mobile;
    this.mobileDefaultsPending = this.mobile;
    this.initialized = false;
    this.capture = doc.getElementById('performance-capture');
    this.captureReadyToCopy = false;
    this.captureMaximum = 10;
    this.urlCapture = false;
    this.urlCaptureWaiting = false;
    this.urlCaptureComplete = false;
    this.runStatus = doc.getElementById('performance-run-status');
    this.runStatus.addEventListener('click', () => {
      if (this.urlCaptureComplete) void this.copyReport();
    });
    this.capture.addEventListener('click', () => {
      if (this.captureReadyToCopy) void this.copyReport();
      else this.send({capture:true});
    });
    this.copyButton = doc.getElementById('performance-copy');
    this.copyStatus = doc.getElementById('performance-copy-status');
    this.reportOutput = doc.getElementById('performance-report-output');
    this.copyButton.addEventListener('click', () => this.copyReport());
    doc.getElementById('performance-export').addEventListener('click', () => this.download());
    this.resolution = doc.getElementById('performance-resolution');
    this.resolution.addEventListener('change', () => {
      this.desiredScale = Number(this.resolution.value);
      this.send({scale:this.desiredScale});
    });
    this.shadows = doc.getElementById('performance-shadows');
    this.shadows.addEventListener('change', () => {
      this.desiredShadows = this.shadows.checked;
      this.send({shadows:this.desiredShadows});
    });
    this.recording = doc.getElementById('performance-recording');
    this.recording.addEventListener('change', () => this.send({recording:this.recording.checked}));
    if (this.mobile) {
      this.resolution.value = String(this.desiredScale);
      this.shadows.checked = false;
    }
    this.button.addEventListener('click', () => this.toggle());
    doc.getElementById('performance-close').addEventListener('click', () => this.toggle(false));
    this.panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.stopPropagation(); this.toggle(false); this.button.focus(); }
    });
    doc.addEventListener('visibilitychange', () => this.send({focused: !doc.hidden}));
  }
  toggle(open = !this.open) {
    this.open = open;
    this.panel.classList.toggle('hidden', !open);
    this.button.setAttribute('aria-expanded', String(open));
    this.button.setAttribute('aria-label', `${open ? 'Close' : 'Open'} performance metrics (${this.fps} FPS)`);
    this.button.title = `${open ? 'Close' : 'Open'} performance metrics · ${this.fps} FPS`;
    if (open) { this.releaseInput(); this.doc.getElementById('performance-close').focus(); }
    this.send({open});
    if (open && this.state) this.render();
  }
  setUrlCapture(maximumSeconds) {
    this.captureMaximum = Number(maximumSeconds) > 0 ? Number(maximumSeconds) : 10;
    this.captureReadyToCopy = false;
    this.urlCapture = true;
    this.urlCaptureWaiting = false;
    this.urlCaptureComplete = false;
    this.runStatus.textContent = `PROFILE 0.0 / ${this.captureMaximum.toFixed(0)}s`;
    this.runStatus.disabled = true;
    this.runStatus.classList.remove('hidden');
  }
  setUrlCapturePending(maximumSeconds) {
    this.captureMaximum = Number(maximumSeconds) > 0 ? Number(maximumSeconds) : 10;
    this.captureReadyToCopy = false;
    this.urlCapture = true;
    this.urlCaptureWaiting = true;
    this.urlCaptureComplete = false;
    this.runStatus.textContent = `WAIT · 0.0 / ${this.captureMaximum.toFixed(0)}s`;
    this.runStatus.disabled = true;
    this.runStatus.classList.remove('hidden');
  }
  update(state) {
    if (!state) return;
    const previous = this.state || {};
    let history = previous.history || [];
    if (state.history) {
      history = state.history_reset === false ? [...history, ...state.history] : state.history;
    }
    history = history.filter(p => p.time >= state.now - 60).slice(-600);
    this.state = {...previous, ...state, history};
    const profile = this.state.profile;
    if (profile?.active) this.copyStatus.textContent = 'CPU + GPU capture running. Copy the report after it finishes.';
    else if (previous.profile?.active && profile) {
      this.captureReadyToCopy = true;
      this.copyStatus.textContent = this.captureComplete(profile)
        ? `Capture ended after ${profile.elapsed.toFixed(1)}s. Tap Copy report to copy it.`
        : `Capture stopped early after ${profile.elapsed.toFixed(1)}s. The report will be marked incomplete.`;
    }
    if (!profile?.active && window.stealthTestOptions?.capture && window.stealthTestOptions?.endReason) {
      this.captureReadyToCopy = true;
      this.copyStatus.textContent = this.captureComplete(profile)
        ? `Test ${window.stealthTestOptions.endReason} after ${Number(profile?.elapsed || 0).toFixed(1)}s. Tap Copy report to copy it.`
        : `Test timer ended after ${Number(profile?.elapsed || 0).toFixed(1)}s, but profiling stopped before the requested duration.`;
    }
    if (this.urlCapture && profile) {
      if (profile.active) {
        this.urlCaptureWaiting = false;
        const maximum = Number(profile.duration) > 0 ? Number(profile.duration) : this.captureMaximum;
        this.runStatus.textContent = `PROFILE ${profile.elapsed.toFixed(1)} / ${maximum.toFixed(0)}s`;
      } else if (previous.profile?.active || window.stealthTestOptions?.endReason) {
        this.urlCaptureComplete = true;
        this.runStatus.disabled = false;
        this.runStatus.textContent = 'COPY PERF REPORT';
        this.copyStatus.textContent = this.captureComplete(profile)
          ? `Capture ended after ${profile.elapsed.toFixed(1)}s. Tap Copy report to copy it.`
          : `Capture stopped early after ${profile.elapsed.toFixed(1)}s. The report will be marked incomplete.`;
      }
    }
    if (!this.initialized) {
      this.initialized = true;
      if (this.mobileDefaultsPending) this.send({scale:this.desiredScale, shadows:this.desiredShadows});
      else if (this.desiredScale !== 1) this.send({scale:this.desiredScale});
    }
    const fps = Number.isFinite(state.fps) ? Math.max(0, Math.round(state.fps)) : 0;
    this.fps = fps;
    this.button.disabled = false;
    this.button.textContent = `${fps} FPS`;
    this.button.setAttribute('aria-label', `${this.open ? 'Close' : 'Open'} performance metrics (${fps} FPS)`);
    this.button.title = `${this.open ? 'Close' : 'Open'} performance metrics · ${fps} FPS`;
    if (this.open) this.render();
  }
  captureComplete(profile) {
    if (!profile || profile.active) return false;
    const options = window.stealthTestOptions || {};
    if (options.endReason === 'completed') return true;
    const expectedSeconds = options.capture
      ? Number(options.timeoutSeconds)
      : (Number(profile.duration) > 0 ? Number(profile.duration) : 10);
    return expectedSeconds > 0 && Number(profile.elapsed) >= expectedSeconds - 0.5;
  }
  render() {
    const s = this.state;
    this.doc.getElementById('performance-stats').textContent = s.samples
      ? `Frame time p50 / p95 / p99: ${s.p50_ms.toFixed(1)} / ${s.p95_ms.toFixed(1)} / ${s.p99_ms.toFixed(1)} ms\nWorst: ${s.max_ms.toFixed(1)} ms · >16.7 ms: ${s.slow} · >33.3 ms: ${s.very_slow}\n${s.samples} active frames · last 10s (up to 8192 frames)${s.paused ? ' · PAUSED' : ''}`
      : 'Waiting for active game frames…';
    if (s.engine) {
      const e = s.engine;
      const ph = s.physics || {}, scene = ph.scene || {};
      const bodies = scene.colliders || {}, shapes = scene.shapes || {};
      const zeroShapeBodies = scene.zero_shape_bodies || {};
      const rayNodes = scene.ray_nodes || {}, shapeCastNodes = scene.shape_cast_nodes || {};
      const staticSources = Array.isArray(scene.static_sources) ? scene.static_sources : [];
      const staticSourceText = staticSources.slice(0, 8).map(row => {
        const types = Object.entries(row.shape_types || {}).map(([type, count]) => `${type} ${count}`).join(', ');
        return `${row.source}: ${row.bodies} bodies / ${row.enabled_shapes} shapes${types ? ` (${types})` : ''}`;
      }).join('\n') || 'none';
      const gpuMs = Number.isFinite(e.gpu_ms) && e.gpu_ms > 0 ? `${e.gpu_ms.toFixed(2)} ms` : 'unavailable';
      this.doc.getElementById('performance-engine').textContent = `Godot 1s peaks: process/render ${e.process_ms.toFixed(2)} ms · physics tick ${e.physics_ms.toFixed(2)} ms · GPU ${gpuMs}\n${e.draw_calls} draws · ${e.primitives} primitives · ${e.nodes} nodes\n3D: ${Math.round(e.width * e.scale)} × ${Math.round(e.height * e.scale)} (${Math.round(e.scale * 100)}%) · ${e.renderer}\nPhysics: ${ph.tick_hz ?? '—'} Hz configured · ${ph.max_steps_per_frame ?? '—'} catch-up steps max · ${ph.active_rigid_bodies ?? '—'} active rigid bodies · ${ph.collision_pairs ?? '—'} pairs / ${ph.islands ?? '—'} islands\nBodies S${bodies.static ?? '—'} C${bodies.character ?? '—'} R${bodies.rigid ?? '—'} A${bodies.animatable ?? '—'} Areas ${bodies.area ?? '—'} · shapes ${shapes.enabled ?? '—'} enabled / ${shapes.disabled ?? '—'} disabled (+ ${shapes.polygons_enabled ?? '—'} / ${shapes.polygons_disabled ?? '—'} polygons)\nStatic collision sources:\n${staticSourceText}\nZero-enabled-shape bodies: ${Object.entries(zeroShapeBodies).map(([kind, count]) => `${kind} ${count}`).join(', ') || 'none'}\nQuery nodes: RayCast3D ${rayNodes.enabled ?? '—'} enabled / ${rayNodes.disabled ?? '—'} disabled · ShapeCast3D ${shapeCastNodes.disabled ?? '—'} disabled / ${shapeCastNodes.enabled ?? '—'} enabled\nVision last sample: ${s.vision_rays ?? 0} direct rays / ${s.vision_candidates ?? 0} candidates across actors · recording ${((s.capture_us || 0) / 1000).toFixed(2)} ms`;
      const ri = s.scene_context?.render_inventory;
      if (ri) this.doc.getElementById('performance-engine').textContent += `\nRender scene: ${ri.scene_visible_mesh_nodes} scene-visible mesh nodes / ${ri.scene_visible_shadow_casters} shadow casters · ${ri.scene_visible_multimeshes} MultiMeshes (${ri.multimesh_instances} instances) · ${ri.active_lights} lights / ${ri.shadow_lights.length} shadow lights. Scene-visible does not mean in camera view.`;
      if (this.mobileDefaultsPending && Math.abs(Number(e.scale) - this.desiredScale) < 0.001 && s.shadows === this.desiredShadows) this.mobileDefaultsPending = false;
      this.resolution.value = String(this.mobileDefaultsPending ? this.desiredScale : e.scale);
      this.shadows.checked = this.mobileDefaultsPending ? this.desiredShadows : s.shadows;
      this.recording.checked = s.recording;
    }
    if (s.profile) {
      const p = s.profile;
      this.capture.disabled = p.active;
      const duration = Number(p.duration) > 0 ? Number(p.duration) : this.captureMaximum;
      this.capture.textContent = p.active
        ? `Capturing… ${p.elapsed.toFixed(1)} / ${duration.toFixed(0)}s`
        : (this.captureReadyToCopy ? 'Copy report' : 'Capture 10s');
      const lines = p.rows.slice(0, 28).map(r => `${r.scope} [${r.domain === 'physics' ? 'tick' : 'frame'}]\n  avg ${r.avg_ms.toFixed(3)} ms · p95 ${r.p95_ms.toFixed(3)} ms · max call ${r.max_call_ms.toFixed(3)} ms · ${r.calls} calls`);
      const actors = p.actors.slice(0, 8).map(a => `${a.actor} [${a.domain}] ${a.avg_ms.toFixed(3)} ms`);
      const frames = p.frame_stats;
      const measuredTickHz = p.elapsed > 0 ? (p.physics_ticks / p.elapsed).toFixed(1) : '—';
      const captureStats = frames?.samples ? `\nCapture FPS: ${frames.fps.toFixed(1)} · frame p50 / p95 / p99: ${frames.p50_ms.toFixed(1)} / ${frames.p95_ms.toFixed(1)} / ${frames.p99_ms.toFixed(1)} ms` : '';
      const gpu = s.gpu_capture || {};
      const gpuStats = gpu.samples
        ? `GPU capture: avg / p50 / p95 ${gpu.avg_ms.toFixed(2)} / ${gpu.p50_ms.toFixed(2)} / ${gpu.p95_ms.toFixed(2)} ms · ${gpu.samples} samples`
        : 'GPU timing unavailable (no WebGL timer-query samples returned)';
      this.doc.getElementById('performance-hotspots').textContent = lines.length
        ? `Capture: ${p.physics_ticks} physics ticks / ${p.render_frames} render frames · ${measuredTickHz} measured ticks/s${captureStats}\n${gpuStats}\nScope averages: whole capture · p95: last 256 ticks/frames\n\n${lines.join('\n')}\n\nActors (inclusive):\n${actors.join('\n')}\n\nactor_physics is inclusive script work across all actor controllers each tick. Engine physics time also includes physics-server work. Perception uses direct-space ray queries; those are not RayCast3D nodes.\nProfiler bookkeeping: ${p.bookkeeping_ms.toFixed(1)} ms over capture (overlaps parent scopes). Timers and UI add overhead.\nObserved clock step: ${p.clock_step_observed_us || 'unknown'} µs (short probe; not guaranteed resolution).`
        : 'Capture 10 seconds of gameplay to rank CPU hotspots.';
    }
    const ctx = this.canvas.getContext('2d'), w = this.canvas.width, h = this.canvas.height;
    const points = s.history || [], now = s.now, left = 48, top = 24, bottom = h - 30;
    const max = Math.ceil(Math.max(60, ...points.map(p => p.fps)) / 30) * 30;
    ctx.fillStyle = '#111e25'; ctx.fillRect(0, 0, w, h);
    ctx.font = '13px monospace';
    for (const value of [0, max / 2, max]) {
      const y = bottom - value / max * (bottom - top);
      ctx.strokeStyle = '#33464f'; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(w - 12, y); ctx.stroke();
      ctx.fillStyle = '#b6c6ce'; ctx.fillText(String(value), 6, y + 4);
    }
    ctx.fillText('FPS', 6, 14);
    for (const ago of [60, 30, 0]) ctx.fillText(`-${ago}s`, left + (60 - ago) / 60 * (w - left - 40), h - 8);
    ctx.strokeStyle = '#c5ee86'; ctx.lineWidth = 2; ctx.beginPath();
    let previous = false;
    for (const p of points) {
      const x = left + (p.time - now + 60) / 60 * (w - left - 12);
      const y = bottom - p.fps / max * (bottom - top);
      if (p.gap || !previous) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      previous = true;
    }
    ctx.stroke();
  }
  download() {
    if (!this.state) return;
    const blob = new Blob([JSON.stringify({format:'imsim.performance', version:1, ...this.state}, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob), link = this.doc.createElement('a');
    link.href = url; link.download = `stealth-performance-${this.state.selection?.level || 'gym'}.json`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  buildReport() {
    const s = this.state || {}, e = s.engine || {}, p = s.profile || {}, sel = s.selection || {};
    const ph = s.physics || {}, scene = ph.scene || {};
    const bodies = scene.colliders || {}, shapes = scene.shapes || {};
    const zeroShapeBodies = scene.zero_shape_bodies || {};
    const rayNodes = scene.ray_nodes || {}, shapeCastNodes = scene.shape_cast_nodes || {};
    const nav = window.navigator || {}, scr = window.screen || {};
    const finite = (value, digits = 2) => value == null || !Number.isFinite(Number(value)) ? null : Number(Number(value).toFixed(digits));
    const rows = Array.isArray(p.rows) ? p.rows : [];
    const actors = Array.isArray(p.actors) ? p.actors : [];
    const ua = nav.userAgent || '';
    const browserMatch = ua.match(/(Firefox|Edg|Chrome|Chromium|CriOS|Version)\/([\d.]+)/);
    const browserName = browserMatch ? ({Edg:'Edge', CriOS:'Chrome', Version:'Safari'}[browserMatch[1]] || browserMatch[1]) : null;
    const browser = browserMatch ? `${browserName} ${browserMatch[2].split('.')[0]}` : null;
    const android = ua.match(/Android\s+([\d.]+)/i);
    const os = android ? `Android ${android[1]}` : nav.userAgentData?.platform || nav.platform || null;
    const orientation = scr.orientation?.type || (window.matchMedia?.('(orientation: landscape)').matches ? 'landscape' : 'portrait');
    const width = window.innerWidth || null, height = window.innerHeight || null;
    const captureFrames = p.frame_stats || {};
    const gpu = s.gpu_capture || {};
    return {
      format: 'imsim.perf',
      version: 6,
      at: new Date().toISOString(),
      run: {
        map: sel.level ?? null,
        brain: sel.mode ?? null,
        seed: sel.seed ?? null,
        limit_s: sel.budget ?? null,
        timeout_s: window.stealthTestOptions?.timeoutSeconds ?? null,
        test_end_reason: window.stealthTestOptions?.endReason || null,
        automated_capture: !!window.stealthTestOptions?.capture,
        model: sel.model ?? null,
        view: s.view ?? null,
        scene: s.scene_context || null
      },
      device: {
        browser,
        os,
        viewport: width && height ? `${width}x${height}` : null,
        dpr: finite(window.devicePixelRatio, 2),
        cores: nav.hardwareConcurrency || null,
        touch: nav.maxTouchPoints || 0,
        landscape: orientation.startsWith('landscape'),
        fullscreen: !!(document.fullscreenElement || document.webkitFullscreenElement),
        visible: !document.hidden
      },
      settings: {
        paused: !!s.paused,
        scale: finite(e.scale, 2),
        shadows: s.shadows ?? null,
        recording: s.recording ?? null
      },
      live: {
        fps: finite(s.fps, 1),
        frames: s.samples ?? 0,
        p50_ms: finite(s.p50_ms, 1),
        p95_ms: finite(s.p95_ms, 1),
        p99_ms: finite(s.p99_ms, 1),
        max_ms: finite(s.max_ms, 1)
      },
      engine: {
        renderer: e.renderer || p.renderer || null,
        occlusion: e.occlusion_culling ?? null,
        frame_ms: finite(e.process_ms, 2),
        physics_ms: finite(e.physics_ms, 2),
        gpu_ms: finite(e.gpu_ms > 0 ? e.gpu_ms : null, 2),
        draws: e.draw_calls ?? null,
        primitives: e.primitives ?? null,
        nodes: e.nodes ?? null,
        render: e.width && e.height ? `${Math.round(e.width * (e.scale || 1))}x${Math.round(e.height * (e.scale || 1))}` : null
      },
      physics: {
        tick_hz: ph.tick_hz ?? null,
        max_steps: ph.max_steps_per_frame ?? null,
        active_rigid: ph.active_rigid_bodies ?? null,
        pairs: ph.collision_pairs ?? null,
        islands: ph.islands ?? null,
        bodies: Object.fromEntries(['static','character','rigid','animatable','area','other'].map(k => [k, bodies[k] ?? null])),
        zero_shape_bodies: Object.fromEntries(['static','character','rigid','animatable','area','other'].map(k => [k, zeroShapeBodies[k] ?? 0])),
        shapes: {
          enabled: shapes.enabled ?? null,
          disabled: shapes.disabled ?? null,
          polygons_enabled: shapes.polygons_enabled ?? null,
          polygons_disabled: shapes.polygons_disabled ?? null
        },
        shape_types: scene.shape_types || {},
        static_sources: (Array.isArray(scene.static_sources) ? scene.static_sources : []).slice(0, 12)
          .map(row => [row.source, row.bodies, row.enabled_shapes, row.disabled_shapes, row.zero_shape_bodies, row.shape_types || {}]),
        ray_nodes: [rayNodes.enabled ?? 0, rayNodes.disabled ?? 0],
        shape_cast_nodes: [shapeCastNodes.enabled ?? 0, shapeCastNodes.disabled ?? 0],
        layer_masks: Array.isArray(scene.collision_masks) ? scene.collision_masks : []
      },
      perception_sample: {
        direct_rays: s.vision_rays ?? 0,
        candidates: s.vision_candidates ?? 0
      },
      capture: {
        elapsed_s: finite(p.elapsed, 1),
        complete: this.captureComplete(p),
        fps: finite(captureFrames.fps, 1),
        frames: p.render_frames ?? null,
        ticks: p.physics_ticks ?? null,
        measured_tick_hz: finite(p.elapsed > 0 ? p.physics_ticks / p.elapsed : null, 1),
        p50_ms: finite(captureFrames.p50_ms, 1),
        p95_ms: finite(captureFrames.p95_ms, 1),
        p99_ms: finite(captureFrames.p99_ms, 1),
        max_ms: finite(captureFrames.max_ms, 1),
        profiler_ms: finite(p.bookkeeping_ms, 1),
        gpu: {
          samples: gpu.samples ?? 0,
          avg_ms: finite(gpu.avg_ms, 2),
          p50_ms: finite(gpu.p50_ms, 2),
          p95_ms: finite(gpu.p95_ms, 2)
        },
        scopes: rows.slice(0, 12).map(r => [r.scope, r.domain === 'physics' ? 'tick' : 'frame', finite(r.avg_ms, 3), finite(r.p95_ms, 3), finite(r.max_call_ms, 3), r.calls]),
        actors: actors.slice(0, 4).map(a => [a.actor, a.domain === 'physics' ? 'tick' : 'frame', finite(a.avg_ms, 3)])
      }
    };
  }
  async copyReport() {
    if (!this.state) {
      this.copyStatus.textContent = 'Waiting for game performance data.';
      return;
    }
    const report = JSON.stringify(this.buildReport(), null, 2);
    this.reportOutput.value = report;
    this.reportOutput.classList.add('hidden');
    try {
      if (!window.navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await window.navigator.clipboard.writeText(report);
      this.copyStatus.textContent = 'Performance report copied. Paste it into your message.';
    } catch (_) {
      this.reportOutput.classList.remove('hidden');
      this.reportOutput.focus();
      this.reportOutput.select();
      this.reportOutput.setSelectionRange(0, this.reportOutput.value.length);
      let copied = false;
      try { copied = document.execCommand('copy'); } catch (_) {}
      if (copied) {
        this.reportOutput.classList.add('hidden');
        this.copyStatus.textContent = 'Performance report copied. Paste it into your message.';
      } else {
        this.copyStatus.textContent = 'Report is selected below. Use Copy, then paste it into your message.';
      }
    }
  }
};
