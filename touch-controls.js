/* Development controls only. Pointer IDs allow moving, looking and acting together. */
window.WebTouchControls = class {
  constructor({root, stick, knob, look, lookKnob, buttons, send, lifecycle = window, visibility = document,
    schedule = setInterval}) {
    Object.assign(this, {root, stick, knob, look, lookKnob, buttons, send});
    this.enabled = false;
    this.pointers = new Map();
    this.lookVector = {x:0, y:0};
    this.reset();
    const bind = (element, kind) => {
      const toggle = ['crouch', 'sprint', 'ads'].includes(kind);
      element.addEventListener('pointerdown', (event) => {
        if (!this.enabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
        event.preventDefault();
        if ([...this.pointers.values()].some((entry) => entry.kind === kind)) return;
        element.setPointerCapture(event.pointerId);
        this.pointers.set(event.pointerId, {kind, x:event.clientX, y:event.clientY});
        if (kind === 'move') this.move(event);
        else if (kind === 'look') this.lookAt(event);
        else if (toggle) {
          this.state[kind] = !this.state[kind];
          if (kind === 'sprint' && this.state.sprint) this.state.crouch = false;
          if (kind === 'crouch' && this.state.crouch) this.state.sprint = false;
        }
        else if (kind !== 'look') this.state[kind] = true;
        if (kind === 'jump') this.state.crouch = false;
        this.draw(); this.flush();
      });
      element.addEventListener('pointermove', (event) => {
        const pointer = this.pointers.get(event.pointerId);
        if (!pointer || !this.enabled) return;
        event.preventDefault();
        if (kind === 'move') this.move(event);
        if (kind === 'look') this.lookAt(event);
        pointer.x = event.clientX; pointer.y = event.clientY;
        this.draw();
      });
      element.addEventListener('pointerup', (event) => {
        if (!this.pointers.delete(event.pointerId)) return;
        if (kind === 'move') this.state.x = this.state.y = 0;
        else if (kind === 'look') this.lookVector = {x:0, y:0};
        else if (kind !== 'look' && !toggle) this.state[kind] = false;
        this.draw(); this.flush();
      });
      for (const event of ['pointercancel', 'lostpointercapture']) element.addEventListener(event, (e) => {
        if (this.pointers.has(e.pointerId)) this.reset();
      });
      element.addEventListener('contextmenu', (event) => event.preventDefault());
    };
    bind(stick, 'move'); bind(look, 'look');
    for (const button of buttons) bind(button, button.dataset.touchAction);
    lifecycle.addEventListener('blur', () => this.reset());
    lifecycle.addEventListener('pagehide', () => this.reset());
    visibility.addEventListener('visibilitychange', () => { if (visibility.hidden) this.reset(); });
    this.timer = schedule(() => { if (this.enabled) this.flush(); }, 33);
  }
  move(event) {
    const rect = this.stick.getBoundingClientRect(), radius = rect.width * 0.36;
    const x = (event.clientX - rect.left - rect.width / 2) / radius;
    const y = (event.clientY - rect.top - rect.height / 2) / radius;
    const length = Math.hypot(x, y), strength = length < 0.12 ? 0 : Math.min(1, length);
    this.state.x = length ? x / length * strength : 0;
    this.state.y = length ? y / length * strength : 0;
  }
  lookAt(event) {
    const rect = this.look.getBoundingClientRect(), radius = rect.width * 0.36;
    const x = (event.clientX - rect.left - rect.width / 2) / radius;
    const y = (event.clientY - rect.top - rect.height / 2) / radius;
    const length = Math.hypot(x, y), strength = Math.min(1, length);
    this.lookVector = length ? {x:x / length * strength, y:y / length * strength} : {x:0, y:0};
  }
  draw() {
    this.knob.style.transform = `translate(${this.state.x * 48}%, ${this.state.y * 48}%)`;
    this.lookKnob.style.transform = `translate(${this.lookVector.x * 48}%, ${this.lookVector.y * 48}%)`;
    for (const button of this.buttons) {
      const action = button.dataset.touchAction, active = !!this.state[action];
      button.classList.toggle('held', active);
      if (['crouch', 'sprint', 'ads'].includes(action)) button.setAttribute('aria-pressed', String(active));
      if (action === 'sprint' || action === 'ads') {
        const label = button.querySelector('.touch-label');
        const name = action === 'ads' ? 'Aim' : 'Sprint';
        if (label) label.textContent = active ? `${name} ON` : name;
        else button.textContent = active ? `${name} ON` : name;
      }
    }
  }
  flush() {
    if (!this.enabled) return;
    // Each heartbeat turns in proportion to stick deflection, like a gamepad axis.
    this.state.look_x = this.lookVector.x * 40;
    this.state.look_y = this.lookVector.y * 40;
    this.send('touch', JSON.stringify(this.state));
    this.state.look_x = this.state.look_y = 0;
  }
  reset() {
    this.pointers.clear();
    this.lookVector = {x:0, y:0};
    this.state = {x:0, y:0, look_x:0, look_y:0, sprint:false, crouch:false, ads:false, lean_left:false, lean_right:false, jump:false, interact:false};
    this.send('release_input');
    this.draw();
  }
  setEnabled(enabled) {
    if (this.enabled === enabled) return;
    // Commit before reset sends across the synchronous game bridge. A state
    // report received inside send() must see the new value, not reset again.
    this.enabled = enabled; this.reset();
  }
};

/* Overview gestures use the fitted game image, including in portrait fullscreen. */
window.OverviewCameraControls = class {
  constructor({canvas, send, lifecycle = window, visibility = document}) {
    Object.assign(this, {canvas, send});
    this.enabled = false;
    this.pointers = new Map();
    canvas.addEventListener('pointerdown', event => {
      if (!this.enabled || (event.pointerType === 'mouse' && event.button !== 0) || this.pointers.size >= 2) return;
      if (!this.inside(event)) return;
      event.preventDefault();
      this.pointers.set(event.pointerId, {x:event.clientX, y:event.clientY});
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.toggle('overview-camera-dragging', true);
    });
    canvas.addEventListener('pointermove', event => {
      if (!this.enabled || !this.pointers.has(event.pointerId)) return;
      event.preventDefault();
      const before = this.gesture();
      this.pointers.set(event.pointerId, {x:event.clientX, y:event.clientY});
      const after = this.gesture();
      const zoom = before.span > 8 && after.span > 8 ? before.span / after.span : 1;
      this.transform(before, after, zoom);
    });
    const release = event => {
      this.pointers.delete(event.pointerId);
      canvas.classList.toggle('overview-camera-dragging', this.pointers.size > 0);
    };
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, release);
    canvas.addEventListener('wheel', event => {
      if (!this.enabled || !this.inside(event)) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? this.rect().height : 1;
      const point = {x:event.clientX, y:event.clientY};
      this.transform(point, point, Math.exp(Math.max(-0.4, Math.min(0.4, event.deltaY * unit * 0.0015))));
    }, {passive:false});
    canvas.addEventListener('dblclick', event => {
      if (!this.enabled || !this.inside(event)) return;
      event.preventDefault(); this.reset(); this.send('overview_reset');
    });
    for (const event of ['blur', 'pagehide', 'resize', 'orientationchange']) lifecycle.addEventListener(event, () => this.reset());
    visibility.addEventListener('visibilitychange', () => { if (visibility.hidden) this.reset(); });
  }
  rect() {
    const box = this.canvas.getBoundingClientRect();
    const aspect = (this.canvas.width || 1280) / (this.canvas.height || 720);
    const width = Math.min(box.width, box.height * aspect), height = width / aspect;
    return {left:box.left + (box.width - width) / 2, top:box.top + (box.height - height) / 2, width, height};
  }
  inside(event) {
    const rect = this.rect();
    return rect.width > 0 && rect.height > 0 && event.clientX >= rect.left && event.clientX <= rect.left + rect.width &&
      event.clientY >= rect.top && event.clientY <= rect.top + rect.height;
  }
  gesture() {
    const [a, b] = this.pointers.values();
    return b ? {x:(a.x + b.x) / 2, y:(a.y + b.y) / 2, span:Math.hypot(b.x - a.x, b.y - a.y)} : {...a, span:0};
  }
  transform(from, to, zoom) {
    const rect = this.rect();
    if (!rect.width || !rect.height || (from.x === to.x && from.y === to.y && zoom === 1)) return;
    this.send('overview_camera', JSON.stringify({from_x:(from.x - rect.left) / rect.width,
      from_y:(from.y - rect.top) / rect.height, to_x:(to.x - rect.left) / rect.width,
      to_y:(to.y - rect.top) / rect.height, zoom:Math.max(0.5, Math.min(2, zoom))}));
  }
  reset() {
    const ids = [...this.pointers.keys()];
    this.pointers.clear();
    for (const id of ids) {
      if (this.canvas.hasPointerCapture?.(id)) this.canvas.releasePointerCapture(id);
    }
    this.canvas.classList.toggle('overview-camera-dragging', false);
  }
  setEnabled(enabled) {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.reset();
    this.canvas.classList.toggle('overview-camera-active', enabled);
  }
};
