/* דיבור בעברית עם קול הדפדפן (Web Speech API) */
const Speech = (() => {
  let enabled = true;
  let voice = null;
  let onTalkChange = null; // כדי להזיז את השועל בזמן דיבור

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  function pickVoice() {
    if (!supported) return;
    const voices = window.speechSynthesis.getVoices() || [];
    const hebrew = voices.filter(v => (v.lang || '').toLowerCase().startsWith('he'));
    // עדיפות לקול של גוגל, אחר כך כל קול עברי אחר
    voice = hebrew.find(v => /google/i.test(v.name)) || hebrew[0] || null;
  }

  function init() {
    if (!supported) return;
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  function stop() {
    if (!supported) return;
    window.speechSynthesis.cancel();
    if (onTalkChange) onTalkChange(false);
  }

  /**
   * הקראת טקסט בעברית.
   * @param {string} text
   * @param {object} opts - rate, interrupt (ברירת מחדל: מבטל דיבור קודם), onend
   */
  function speak(text, opts = {}) {
    const { rate = 0.92, interrupt = true, onend = null } = opts;
    if (!enabled || !supported || !text) {
      if (onend) setTimeout(onend, 50);
      return;
    }
    if (interrupt) window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'he-IL';
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = 1.05;
    u.onstart = () => { if (onTalkChange) onTalkChange(true); };
    const done = () => {
      if (onTalkChange && !window.speechSynthesis.speaking) onTalkChange(false);
      if (onend) onend();
    };
    u.onend = done;
    u.onerror = done;
    window.speechSynthesis.speak(u);
  }

  return {
    init,
    speak,
    stop,
    supported,
    setEnabled(v) { enabled = v; if (!v) stop(); },
    hasHebrewVoice() { return !!voice; },
    setTalkListener(fn) { onTalkChange = fn; }
  };
})();

if (typeof module !== 'undefined') module.exports = Speech;
