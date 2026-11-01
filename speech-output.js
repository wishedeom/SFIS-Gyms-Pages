/* Browser TTS adapter for Web builds; voices are supplied by the user's browser/device. */
(() => {
  const synth = window.speechSynthesis;
  const Utterance = window.SpeechSynthesisUtterance;
  let voices = [];

  function refreshVoices() {
    try { voices = synth?.getVoices?.() || []; }
    catch (_) { voices = []; }
  }

  refreshVoices();
  synth?.addEventListener?.('voiceschanged', refreshVoices);

  window.stealthTtsAvailable = () => !!(window.speechSynthesis && Utterance);
  window.stealthTtsSpeak = (value) => {
    if (!window.stealthTtsAvailable()) return false;
    const text = String(value ?? '').trim();
    if (!text) return false;
    try {
      refreshVoices();
      const utterance = new Utterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1;
      const english = voices.find((voice) => /^en(?:[-_]|$)/i.test(voice.lang || ''));
      if (english) utterance.voice = english;
      synth.cancel();
      synth.speak(utterance);
      return true;
    } catch (_) {
      return false;
    }
  };
  window.stealthTtsStop = () => {
    try { synth?.cancel?.(); } catch (_) {}
  };
})();
