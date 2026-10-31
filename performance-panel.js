/* Engine-frame telemetry only; no browser animation-loop FPS estimate. */
window.PerformancePanel = class {
  constructor(doc, send, releaseInput, options = {}) {
    this.doc = doc; this.send = send; this.releaseInput = releaseInput;
    this.button = doc.getElementById('fps-counter');
    this.panel = doc.getElementById('performance-panel');
    this.canvas = doc.getElementById('performance-graph');
    this.open = false;
    this.fps = 0;
    this.desiredScale = options.mobile ? 0.75 : 1;
    this.initialized = false;
    this.capture = doc.getElementById('performance-capture');
    this.capture.addEventListener('click', () => this.send({capture:true}));
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
    this.shadows.addEventListener('change', () => this.send({shadows:this.shadows.checked}));
    this.recording = doc.getElementById('performance-recording');
    this.recording.addEventListener('change', () => this.send({recording:this.recording.checked}));
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
    if (profile?.active) this.copyStatus.textContent = 'CPU capture running. Copy the report after it finishes.';
    else if (previous.profile?.active && profile) this.copyStatus.textContent = profile.elapsed >= 9.5
      ? 'Capture complete. Tap Copy perf report to share it.'
      : `Capture ended after ${profile.elapsed.toFixed(1)}s. You can still copy the report.`;
    if (!this.initialized) {
      this.initialized = true;
      if (this.desiredScale !== 1) this.send({scale:this.desiredScale});
    }
    const fps = Number.isFinite(state.fps) ? Math.max(0, Math.round(state.fps)) : 0;
    this.fps = fps;
    this.button.disabled = false;
    this.button.textContent = `${fps} FPS`;
    this.button.setAttribute('aria-label', `${this.open ? 'Close' : 'Open'} performance metrics (${fps} FPS)`);
    this.button.title = `${this.open ? 'Close' : 'Open'} performance metrics · ${fps} FPS`;
    if (this.open) this.render();
  }
  render() {
    const s = this.state;
    this.doc.getElementById('performance-stats').textContent = s.samples
      ? `Frame time p50 / p95 / p99: ${s.p50_ms.toFixed(1)} / ${s.p95_ms.toFixed(1)} / ${s.p99_ms.toFixed(1)} ms\nWorst: ${s.max_ms.toFixed(1)} ms · >16.7 ms: ${s.slow} · >33.3 ms: ${s.very_slow}\n${s.samples} active frames · last 10s (up to 8192 frames)${s.paused ? ' · PAUSED' : ''}`
      : 'Waiting for active game frames…';
    if (s.engine) {
      const e = s.engine;
      this.doc.getElementById('performance-engine').textContent = `Latest engine snapshot: frame ${e.process_ms.toFixed(2)} ms · physics ${e.physics_ms.toFixed(2)} ms\n${e.draw_calls} draw calls · ${e.primitives} primitives · ${e.nodes} nodes\n3D: ${Math.round(e.width * e.scale)} × ${Math.round(e.height * e.scale)} (${Math.round(e.scale * 100)}%) · ${e.renderer}\nVision: ${s.vision_rays ?? 0} rays / ${s.vision_candidates ?? 0} candidates per tick\nLast recording capture: ${((s.capture_us || 0) / 1000).toFixed(2)} ms · GPU timing unavailable`;
      this.resolution.value = String(e.scale);
      this.shadows.checked = s.shadows;
      this.recording.checked = s.recording;
    }
    if (s.profile) {
      const p = s.profile;
      this.capture.disabled = p.active;
      this.capture.textContent = p.active ? `Capturing… ${p.elapsed.toFixed(1)} / 10s` : 'Capture CPU profile · 10s';
      const lines = p.rows.slice(0, 28).map(r => `${r.scope} [${r.domain === 'physics' ? 'tick' : 'frame'}]\n  avg ${r.avg_ms.toFixed(3)} ms · p95 ${r.p95_ms.toFixed(3)} ms · max call ${r.max_call_ms.toFixed(3)} ms · ${r.calls} calls`);
      const actors = p.actors.slice(0, 8).map(a => `${a.actor} [${a.domain}] ${a.avg_ms.toFixed(3)} ms`);
      const frames = p.frame_stats;
      const captureStats = frames?.samples ? `\nCapture FPS: ${frames.fps.toFixed(1)} · frame p50 / p95 / p99: ${frames.p50_ms.toFixed(1)} / ${frames.p95_ms.toFixed(1)} / ${frames.p99_ms.toFixed(1)} ms` : '';
      this.doc.getElementById('performance-hotspots').textContent = lines.length
        ? `Capture: ${p.physics_ticks} physics ticks / ${p.render_frames} render frames${captureStats}\nScope averages: whole capture · p95: last 256 ticks/frames\n\n${lines.join('\n')}\n\nActors (inclusive):\n${actors.join('\n')}\n\nProfiler bookkeeping: ${p.bookkeeping_ms.toFixed(1)} ms over capture (overlaps parent scopes). Timers and UI add overhead.\nObserved clock step: ${p.clock_step_observed_us || 'unknown'} µs (short probe; not guaranteed resolution).`
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
    const nav = window.navigator || {}, scr = window.screen || {}, connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    const finite = (value, digits = 2) => value == null || !Number.isFinite(Number(value)) ? null : Number(Number(value).toFixed(digits));
    const rows = Array.isArray(p.rows) ? p.rows : [];
    const actors = Array.isArray(p.actors) ? p.actors : [];
    const orientation = scr.orientation?.type || (window.matchMedia?.('(orientation: landscape)').matches ? 'landscape' : 'portrait');
    return {
      format: 'imsim.performance-report',
      version: 1,
      created_at_utc: new Date().toISOString(),
      selection: {
        level: sel.level ?? null,
        mode: sel.mode ?? null,
        seed: sel.seed ?? null,
        time_limit_seconds: sel.budget ?? null,
        model: sel.model ?? null
      },
      browser_device: {
        user_agent: nav.userAgent || null,
        platform: nav.userAgentData?.platform || nav.platform || null,
        vendor: nav.vendor || null,
        logical_cpu_cores: nav.hardwareConcurrency || null,
        device_memory_gb_reported: nav.deviceMemory || null,
        screen_css_pixels: {width: scr.width || null, height: scr.height || null},
        viewport_css_pixels: {width: window.innerWidth || null, height: window.innerHeight || null},
        device_pixel_ratio: finite(window.devicePixelRatio, 3),
        max_touch_points: nav.maxTouchPoints || 0,
        coarse_pointer: !!window.matchMedia?.('(pointer: coarse)').matches,
        orientation,
        fullscreen: !!(document.fullscreenElement || document.webkitFullscreenElement),
        page_visible: !document.hidden,
        connection: connection ? {
          effective_type: connection.effectiveType || null,
          downlink_mbps: finite(connection.downlink),
          round_trip_ms: finite(connection.rtt, 0),
          save_data: !!connection.saveData
        } : null
      },
      game_state: {
        paused: !!s.paused,
        render_scale: finite(e.scale, 3),
        render_target_pixels: e.width && e.height ? {
          width: Math.round(e.width * (e.scale || 1)),
          height: Math.round(e.height * (e.scale || 1))
        } : null,
        shadows: s.shadows ?? null,
        inspector_recording: s.recording ?? null,
        vision_rays_per_tick: s.vision_rays ?? null,
        vision_candidates_per_tick: s.vision_candidates ?? null,
        last_recording_capture_ms: finite((s.capture_us || 0) / 1000)
      },
      runtime: {
        engine_platform: e.platform || p.platform || null,
        renderer: e.renderer || p.renderer || null,
        frame_process_ms_latest: finite(e.process_ms, 3),
        physics_process_ms_latest: finite(e.physics_ms, 3),
        draw_calls_latest: e.draw_calls ?? null,
        primitives_latest: e.primitives ?? null,
        node_count_latest: e.nodes ?? null
      },
      live_frame_stats_last_10_seconds: {
        samples: s.samples ?? 0,
        fps_last_second: finite(s.fps, 2),
        p50_ms: finite(s.p50_ms, 2),
        p95_ms: finite(s.p95_ms, 2),
        p99_ms: finite(s.p99_ms, 2),
        worst_ms: finite(s.max_ms, 2),
        frames_over_16_7_ms: s.slow ?? 0,
        frames_over_33_3_ms: s.very_slow ?? 0,
        paused: !!s.paused
      },
      cpu_capture: {
        requested_seconds: 10,
        elapsed_seconds: finite(p.elapsed, 2),
        complete: !p.active && Number(p.elapsed) >= 9.5,
        active: !!p.active,
        render_frames: p.render_frames ?? null,
        physics_ticks: p.physics_ticks ?? null,
        frame_stats: p.frame_stats ? {
          samples: p.frame_stats.samples ?? 0,
          average_fps: finite(p.frame_stats.fps, 2),
          p50_ms: finite(p.frame_stats.p50_ms, 2),
          p95_ms: finite(p.frame_stats.p95_ms, 2),
          p99_ms: finite(p.frame_stats.p99_ms, 2),
          worst_ms: finite(p.frame_stats.max_ms, 2)
        } : null,
        profiler_overhead_ms: finite(p.bookkeeping_ms, 2),
        clock_step_observed_us: p.clock_step_observed_us ?? null,
        top_cpu_scopes: rows.slice(0, 40).map(r => ({
          scope: r.scope, domain: r.domain, average_ms: finite(r.avg_ms, 4),
          p95_ms: finite(r.p95_ms, 4), max_call_ms: finite(r.max_call_ms, 4), calls: r.calls
        })),
        omitted_cpu_scope_count: Math.max(0, rows.length - 40),
        top_actors: actors.slice(0, 12).map(a => ({actor: a.actor, domain: a.domain, average_ms: finite(a.avg_ms, 4)}))
      },
      notes: [
        'GPU frame timing is not exposed by this browser build.',
        'CPU capture instrumentation adds overhead; compare runs using the same capture procedure.',
        'Browser-reported device memory and CPU cores may be unavailable or approximate.'
      ]
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
