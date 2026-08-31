/* צלילים - הכול מיוצר עם Web Audio API, בלי קבצי אודיו */
const Sounds = (() => {
  let ctx = null;
  let master = null;
  let enabled = true;

  function ensure() {
    if (!window.AudioContext && !window.webkitAudioContext) return null;
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* נגינת תו בודד */
  function tone({ freq = 440, type = 'sine', dur = 0.2, at = 0, vol = 1, slide = 0 }) {
    if (!enabled || !ensure()) return;
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /* רעש קצר (לאפקט מחיאות/ווש) */
  function noise({ dur = 0.3, at = 0, vol = 0.3, freq = 1800 }) {
    if (!enabled || !ensure()) return;
    const t = ctx.currentTime + at;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filter).connect(g).connect(master);
    src.start(t);
  }

  const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0]; // סולם פנטטוני שמח

  return {
    ensure,
    setEnabled(v) { enabled = v; },

    click() { tone({ freq: 700, type: 'triangle', dur: 0.08, vol: 0.5 }); },

    /* צליל ספירה - כל לחיצה על חפץ עולה בגובה */
    count(n) {
      const idx = (n - 1) % PENTA.length;
      const oct = Math.floor((n - 1) / PENTA.length);
      tone({ freq: PENTA[idx] * Math.pow(2, oct), type: 'triangle', dur: 0.22, vol: 0.7 });
    },

    correct() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone({ freq: f, type: 'triangle', dur: 0.24, at: i * 0.09, vol: 0.7 }));
      noise({ dur: 0.25, at: 0.05, vol: 0.12, freq: 5000 });
    },

    wrong() {
      tone({ freq: 320, type: 'sine', dur: 0.25, vol: 0.5, slide: -80 });
      tone({ freq: 240, type: 'sine', dur: 0.3, at: 0.18, vol: 0.5, slide: -60 });
    },

    star() {
      tone({ freq: 1318.5, type: 'sine', dur: 0.35, vol: 0.6 });
      tone({ freq: 1975.5, type: 'sine', dur: 0.4, at: 0.08, vol: 0.4 });
    },

    unlock() {
      tone({ freq: 500, type: 'triangle', dur: 0.1, vol: 0.5 });
      tone({ freq: 900, type: 'triangle', dur: 0.15, at: 0.08, vol: 0.6 });
    },

    tick() { tone({ freq: 260, type: 'square', dur: 0.06, vol: 0.15 }); },

    whoosh() { noise({ dur: 0.5, vol: 0.25, freq: 900 }); },

    levelup() {
      const seq = [523.25, 523.25, 587.33, 659.25, 783.99, 1046.5, 1318.5];
      seq.forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.3, at: i * 0.13, vol: 0.75 }));
      seq.forEach((f, i) => tone({ freq: f / 2, type: 'sine', dur: 0.3, at: i * 0.13, vol: 0.35 }));
      noise({ dur: 0.8, at: 0.9, vol: 0.2, freq: 4000 });
    },

    sticker() {
      [880, 1108.7, 1318.5].forEach((f, i) =>
        tone({ freq: f, type: 'sine', dur: 0.3, at: i * 0.07, vol: 0.55 }));
    }
  };
})();

if (typeof module !== 'undefined') module.exports = Sounds;
