/* Camera presentation only: commands still use the shared session channel. */
window.PerspectiveMenu = class PerspectiveMenu {
  constructor({root, toggle, panel, tooltip, buttons, send, onOpen, doc = document, host = window, delay = 500}) {
    Object.assign(this, {root, toggle, panel, tooltip, buttons, send, onOpen, host});
    this.enabled = false;
    this.open = false;
    this.timer = null;
    this.held = null;
    this.suppressed = null;
    toggle.addEventListener('click', event => {
      if (this.consumeHold(event, toggle) || !this.enabled) return;
      this.setOpen(!this.open);
    });
    for (const button of buttons) button.addEventListener('click', event => {
      if (this.consumeHold(event, button) || !this.enabled) return;
      this.send(button.dataset.command);
      this.close();
      toggle.focus({preventScroll:true});
    }, {capture:true});
    for (const button of [toggle, ...buttons]) {
      button.addEventListener('pointerdown', event => {
        if (!this.enabled || event.button > 0) return;
        this.cancelHold(); this.suppressed = null;
        this.held = {button, x:event.clientX, y:event.clientY};
        this.timer = host.setTimeout(() => {
          this.suppressed = button;
          tooltip.textContent = button.getAttribute('aria-label');
          tooltip.classList.remove('hidden');
          const width = tooltip.getBoundingClientRect().width;
          const height = tooltip.getBoundingClientRect().height;
          // Above the finger, or below it if the button touches the top edge.
          tooltip.style.left = `${Math.max(8, Math.min(event.clientX - width / 2, host.innerWidth - width - 8))}px`;
          tooltip.style.top = `${event.clientY > height + 64 ? event.clientY - height - 56 : event.clientY + 64}px`;
        }, delay);
      });
      button.addEventListener('pointermove', event => {
        if (this.held && Math.hypot(event.clientX-this.held.x,event.clientY-this.held.y) > 12) {
          this.suppressed = button; this.cancelHold();
        }
      });
      button.addEventListener('contextmenu', event => event.preventDefault());
    }
    for (const name of ['pointerup', 'pointercancel']) doc.addEventListener(name, () => this.cancelHold());
    doc.addEventListener('pointerdown', event => { if (!root.contains(event.target)) this.close(); });
    doc.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || (!this.open && !this.held)) return;
      this.close();
      if (this.enabled) toggle.focus({preventScroll:true});
    });
    for (const name of ['blur', 'pagehide', 'resize']) host.addEventListener(name, () => this.close());
  }
  consumeHold(event, button) {
    if (this.suppressed !== button) return false;
    this.suppressed = null;
    event.preventDefault(); event.stopImmediatePropagation();
    return true;
  }
  cancelHold() {
    this.host.clearTimeout(this.timer); this.timer = null; this.held = null;
    this.tooltip.classList.add('hidden');
  }
  setOpen(open) {
    this.open = !!open && this.enabled;
    this.panel.classList.toggle('hidden', !this.open);
    this.toggle.setAttribute('aria-expanded', String(this.open));
    if (this.open) this.onOpen?.();
    this.cancelHold();
  }
  close() { this.setOpen(false); }
  update(enabled, view) {
    this.enabled = !!enabled;
    this.root.classList.toggle('hidden', !this.enabled);
    this.toggle.disabled = !this.enabled;
    if (!this.enabled) this.close();
    for (const button of this.buttons) {
      button.disabled = !this.enabled;
      button.classList.toggle('selected', button.dataset.command === view);
      button.setAttribute('aria-pressed', String(button.dataset.command === view));
    }
  }
};
