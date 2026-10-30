/* Browser-only controls for the engine's declared debug layers. No gameplay policy. */
class DebugVisualControls {
  constructor(doc, send, opened = () => {}) {
    this.doc = doc; this.send = send; this.checks = new Map(); this.schema = '';
    this.toggle = doc.getElementById('debug-view-toggle');
    this.panel = doc.getElementById('debug-view-panel');
    this.list = doc.getElementById('debug-view-layers');
    this.showAll = doc.getElementById('debug-show-all');
    this.hideAll = doc.getElementById('debug-hide-all');
    this.hint = doc.getElementById('debug-view-hint');
    this.toggle.addEventListener('click', () => {
      const open = this.toggle.getAttribute('aria-expanded') !== 'true';
      this.toggle.setAttribute('aria-expanded', String(open));
      this.panel.classList.toggle('hidden', !open);
      if (open) opened();
    });
    doc.getElementById('debug-view-close').addEventListener('click', () => {
      this.toggle.setAttribute('aria-expanded', 'false'); this.panel.classList.add('hidden');
    });
    this.showAll.addEventListener('click', () => this.all(true));
    this.hideAll.addEventListener('click', () => this.all(false));
    this.setEnabled(false);
  }
  setEnabled(value) {
    this.hint.textContent = value ? 'Debug draws start disabled. Your choices survive level changes and replays.' : 'Load the demo to enable these controls.';
    this.showAll.disabled = this.hideAll.disabled = !value;
    for (const check of this.checks.values()) check.disabled = !value;
    this.enabled = value;
  }
  all(value) {
    if (!this.enabled) return;
    for (const check of this.checks.values()) check.checked = value;
    this.send({all:value});
  }
  update(snapshot) {
    if (!snapshot?.layers || !snapshot?.values) return;
    const signature = JSON.stringify(snapshot.layers);
    if (signature !== this.schema) {
      this.schema = signature; this.checks.clear(); this.list.replaceChildren();
      for (const layer of snapshot.layers) {
        const label = this.doc.createElement('label'), check = this.doc.createElement('input'), text = this.doc.createElement('span');
        check.type = 'checkbox'; check.dataset.layer = layer.id;
        text.textContent = layer.label;
        check.addEventListener('change', () => {
          if (this.enabled) this.send({values:{[layer.id]:check.checked}});
        });
        label.appendChild(check); label.appendChild(text); this.list.appendChild(label);
        this.checks.set(layer.id, check);
      }
    }
    for (const [id, check] of this.checks) check.checked = snapshot.values[id] === true;
    this.setEnabled(this.enabled);
  }
}
