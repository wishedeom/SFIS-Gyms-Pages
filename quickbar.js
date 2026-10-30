/* Device presenter only: every selection is an actor inventory intent. */
window.QuickBarDrawer = class {
  constructor({root, send, onOpenChange, document:doc = document, lifecycle = window}) {
    Object.assign(this, {root, send, onOpenChange, doc});
    this.enabled = false; this.open = false; this.pointer = null; this.state = {};
    this.handle = doc.createElement('button');
    this.handle.type = 'button'; this.handle.className = 'quickbar-handle';
    this.handle.textContent = '⌃ Equipment';
    this.handle.setAttribute('aria-label', 'Swipe up or tap to open quick slots');
    this.handle.setAttribute('aria-expanded', 'false');
    root.append(this.handle);
    this.sheet = doc.createElement('section'); this.sheet.className = 'quickbar-sheet hidden';
    this.sheet.setAttribute('aria-label', 'Quick slots');
    const heading = doc.createElement('div'); heading.className = 'quickbar-heading';
    const title = doc.createElement('strong'); title.textContent = 'QUICK SLOTS'; heading.append(title);
    const close = doc.createElement('button'); close.type = 'button'; close.textContent = 'Close ⌄';
    close.addEventListener('click', () => this.setOpen(false)); heading.append(close); this.sheet.append(heading);
    this.grid = doc.createElement('div'); this.grid.className = 'quickbar-grid'; this.sheet.append(this.grid);
    this.slots = Array.from({length:10}, (_, index) => {
      const button = doc.createElement('button'); button.type = 'button';
      const key = doc.createElement('small'), icon = doc.createElement('img'), label = doc.createElement('span');
      key.textContent = String((index + 1) % 10); icon.alt = ''; icon.draggable = false;
      button.append(key, icon, label); button.addEventListener('click', () => this.activate(index));
      this.grid.append(button); return {button, icon, label};
    });
    const hint = doc.createElement('small'); hint.textContent = 'Assign slots from the inventory. The world keeps running.';
    this.sheet.append(hint); root.append(this.sheet);
    this.handle.addEventListener('pointerdown', event => {
      if (!this.enabled || (event.pointerType === 'mouse' && event.button !== 0) || this.pointer) return;
      event.preventDefault(); this.pointer = {id:event.pointerId, x:event.clientX, y:event.clientY}; this.swiped = false;
      this.handle.setPointerCapture?.(event.pointerId);
    });
    this.handle.addEventListener('pointermove', event => {
      if (!this.pointer || event.pointerId !== this.pointer.id) return;
      event.preventDefault(); const dy = event.clientY - this.pointer.y, dx = event.clientX - this.pointer.x;
      if (dy < -24 && -dy > Math.abs(dx) * 1.2) { this.swiped = true; this.setOpen(true); }
      if (dy > 24 && dy > Math.abs(dx) * 1.2) { this.swiped = true; this.setOpen(false); }
    });
    this.handle.addEventListener('pointerup', event => {
      if (event.pointerId !== this.pointer?.id) return;
      this.pointer = null; this.handle.releasePointerCapture?.(event.pointerId);
    });
    this.handle.addEventListener('pointercancel', () => { this.pointer = null; this.setOpen(false); });
    this.handle.addEventListener('lostpointercapture', () => { this.pointer = null; });
    this.handle.addEventListener('click', () => {
      if (!this.swiped) this.setOpen(!this.open);
      this.swiped = false;
    });
    doc.addEventListener('keydown', event => { if (event.key === 'Escape') this.setOpen(false); });
    for (const name of ['blur', 'pagehide', 'orientationchange']) lifecycle.addEventListener(name, () => { this.pointer = null; this.setOpen(false); });
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) this.setOpen(false); });
  }
  setEnabled(enabled) {
    this.enabled = !!enabled; this.root.classList.toggle('hidden', !this.enabled);
    if (!this.enabled) { this.pointer = null; this.setOpen(false); }
  }
  setOpen(open) {
    open = !!open && this.enabled;
    if (open === this.open) return;
    this.open = open; this.sheet.classList.toggle('hidden', !open);
    this.root.classList.toggle('is-open', open);
    this.handle.setAttribute('aria-expanded', String(open)); this.onOpenChange?.(open);
  }
  update(state) {
    const next = state || {};
    if (this.state.actor !== next.actor) this.setOpen(false);
    this.state = next;
    for (let index = 0; index < 10; index++) {
      const slot = next.slots?.[index] || {}, {button, icon, label} = this.slots[index];
      const occupied = !!slot.item, selected = occupied && next.drawn && slot.weapon_id === next.equipped_weapon;
      button.disabled = !occupied; button.classList.toggle('selected', !!selected);
      button.setAttribute('aria-pressed', String(!!selected));
      label.textContent = occupied ? (slot.kind === 'melee' ? slot.label : `${slot.label} · ${slot.kind === 'grenade' ? slot.quantity : slot.state?.magazine ?? 0}`) : 'Empty';
      const file = /^res:\/\/assets\/weapons\/inventory_icons\/([a-zA-Z0-9_-]+\.png)$/.exec(slot.icon || '')?.[1];
      icon.hidden = !file;
      if (file && icon.getAttribute('src') !== `inventory-icons/${file}`) icon.setAttribute('src', `inventory-icons/${file}`);
    }
  }
  activate(index) {
    const slot = this.state.slots?.[index];
    if (!this.enabled || !this.open || !slot?.item) return;
    const packet = {slot:index, actor:this.state.actor, item:slot.item};
    this.setOpen(false);
    this.send('quickbar', JSON.stringify(packet));
  }
};
