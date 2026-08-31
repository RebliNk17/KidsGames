/* ═══════════════ ניהול האפליקציה: מצב, מסכים, הגדרות, PWA ═══════════════ */

const App = (() => {
  const STORAGE_KEY = 'kidsgames-progress-v1';
  const $ = id => document.getElementById(id);

  const DEFAULT_STATE = {
    v: 1,
    maxLevel: 1,       // הרמה הגבוהה שנפתחה (חלון הרמות נגזר ממנה)
    stars: 0,          // התקדמות לרמה הבאה
    explainedUpTo: 0,  // עד איזו רמה כבר הוצג הסבר
    totalStars: 0,
    answered: 0,
    firstTry: 0,
    soundOn: true,
    speechOn: true
  };

  let state = load();
  let deferredInstall = null;

  /* ─── שמירה וטעינה ─── */

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return Object.assign({}, DEFAULT_STATE, JSON.parse(raw));
    } catch (e) { /* אחסון חסום - משחקים בלי שמירה */ }
    return Object.assign({}, DEFAULT_STATE);
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* לא נורא */ }
  }

  /* ─── מסכים ─── */

  function show(screenId) {
    ['screen-home', 'screen-game'].forEach(id => $(id).classList.add('hidden'));
    $(screenId).classList.remove('hidden');
  }

  function goHome() {
    Game.stop();
    show('screen-home');
    refreshHome();
  }

  function startMath() {
    Sounds.ensure();
    Sounds.click();
    show('screen-game');
    Game.open();
  }

  /* ─── מסך הבית ─── */

  function refreshHome() {
    const L = Levels.LEVELS;
    $('math-card-info').textContent =
      `רמה ${state.maxLevel} מתוך ${L.length} · ${L[state.maxLevel - 1].name}`;

    const row = $('sticker-row');
    row.innerHTML = '';
    if (state.maxLevel === 1 && state.totalStars === 0) {
      const note = document.createElement('span');
      note.className = 'empty-note';
      note.textContent = 'שחק ואסוף מדבקות וכוכבים! ✨';
      row.appendChild(note);
    } else {
      for (let i = 0; i < L.length; i++) {
        const s = document.createElement('span');
        const done = i < state.maxLevel - 1;
        const current = i === state.maxLevel - 1;
        if (!done && !current) continue;
        s.className = 'sticker' + (current ? ' pending' : '');
        s.textContent = L[i].icon;
        s.style.animationDelay = (i * 60) + 'ms';
        s.title = L[i].name;
        row.appendChild(s);
      }
    }
    $('total-stars').textContent = state.totalStars > 0
      ? `אספת ${state.totalStars} ⭐ עד עכשיו!`
      : '';
  }

  /* ─── רקע מונפש ─── */

  function makeBubbles() {
    const box = $('bg-bubbles');
    const icons = ['⭐', '🎈', '☁️', '✨', '🔢', '➕', '💜', '🌈'];
    for (let i = 0; i < 14; i++) {
      const b = document.createElement('span');
      b.className = 'bubble';
      b.textContent = icons[i % icons.length];
      b.style.left = Math.random() * 100 + 'vw';
      b.style.animationDuration = (14 + Math.random() * 18) + 's';
      b.style.animationDelay = (-Math.random() * 20) + 's';
      b.style.fontSize = (22 + Math.random() * 26) + 'px';
      box.appendChild(b);
    }
  }

  /* ─── אזור הורים (לחיצה ארוכה על גלגל השיניים) ─── */

  function setupParentGate() {
    const gear = $('btn-settings');
    let holdTimer = null;

    const start = () => {
      gear.classList.add('holding');
      holdTimer = setTimeout(() => {
        gear.classList.remove('holding');
        openSettings();
      }, 1500);
    };
    const cancel = (showHint) => {
      gear.classList.remove('holding');
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
        if (showHint) toastHint('להורים: החזיקו את הכפתור לחוץ 🔒');
      }
    };

    gear.addEventListener('pointerdown', ev => { ev.preventDefault(); start(); });
    gear.addEventListener('pointerup', () => cancel(true));
    gear.addEventListener('pointerleave', () => cancel(false));
    gear.addEventListener('contextmenu', ev => ev.preventDefault());
  }

  function toastHint(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 1800);
  }

  function openSettings() {
    Sounds.click();
    updateSettingsUI();
    $('overlay-settings').classList.remove('hidden');
  }

  function updateSettingsUI() {
    const sSound = $('set-sound'), sSpeech = $('set-speech');
    sSound.textContent = state.soundOn ? 'פועל 🔔' : 'כבוי 🔕';
    sSound.classList.toggle('off', !state.soundOn);
    sSpeech.textContent = state.speechOn ? 'פועל 🗣️' : 'כבוי 🤐';
    sSpeech.classList.toggle('off', !state.speechOn);
    $('set-lvl-val').textContent = String(state.maxLevel);
    const acc = state.answered ? Math.round(100 * state.firstTry / state.answered) : 0;
    $('set-stats').textContent =
      `ענה על ${state.answered} תרגילים · ${state.firstTry} נכונים בניסיון ראשון (${acc}%)`;
    if (Speech.supported && !Speech.hasHebrewVoice()) {
      $('set-stats').textContent += ' · ⚠️ לא נמצא קול עברי במכשיר';
    }
  }

  function setupSettings() {
    $('set-close').addEventListener('click', () => {
      $('overlay-settings').classList.add('hidden');
      refreshHome();
    });

    $('set-sound').addEventListener('click', () => {
      state.soundOn = !state.soundOn;
      Sounds.setEnabled(state.soundOn);
      save();
      updateSettingsUI();
      if (state.soundOn) Sounds.correct();
    });

    $('set-speech').addEventListener('click', () => {
      state.speechOn = !state.speechOn;
      Speech.setEnabled(state.speechOn);
      save();
      updateSettingsUI();
      if (state.speechOn) Speech.speak('הדיבור פועל!');
    });

    $('set-test-voice').addEventListener('click', () => {
      Speech.speak('שלום! ככה אני נשמע. בוא נלמד חשבון ביחד!');
    });

    $('set-lvl-down').addEventListener('click', () => {
      if (state.maxLevel > 1) {
        state.maxLevel--;
        Game.applyLevelChange();
        updateSettingsUI();
      }
    });

    $('set-lvl-up').addEventListener('click', () => {
      if (state.maxLevel < Levels.LEVELS.length) {
        state.maxLevel++;
        Game.applyLevelChange();
        updateSettingsUI();
      }
    });

    $('set-reset').addEventListener('click', () => {
      $('overlay-confirm').classList.remove('hidden');
    });

    $('confirm-no').addEventListener('click', () => {
      $('overlay-confirm').classList.add('hidden');
    });

    $('confirm-yes').addEventListener('click', () => {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { }
      location.reload();
    });
  }

  /* ─── התקנה כאפליקציה ─── */

  function setupInstall() {
    window.addEventListener('beforeinstallprompt', ev => {
      ev.preventDefault();
      deferredInstall = ev;
      $('btn-install').classList.remove('hidden');
    });

    $('btn-install').addEventListener('click', async () => {
      if (!deferredInstall) return;
      deferredInstall.prompt();
      await deferredInstall.userChoice;
      deferredInstall = null;
      $('btn-install').classList.add('hidden');
    });

    window.addEventListener('appinstalled', () => {
      $('btn-install').classList.add('hidden');
    });
  }

  function registerSW() {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(() => { });
    }
  }

  /* ─── אתחול ─── */

  function init() {
    Speech.init();
    Sounds.setEnabled(state.soundOn);
    Speech.setEnabled(state.speechOn);
    Speech.setTalkListener(talking => {
      $('mascot').classList.toggle('talking', talking);
    });

    makeBubbles();
    refreshHome();
    setupParentGate();
    setupSettings();
    setupInstall();
    registerSW();
    Game.init();

    // פתיחת אודיו בלחיצה הראשונה על המסך
    document.addEventListener('pointerdown', () => Sounds.ensure(), { once: true });

    $('card-math').addEventListener('click', startMath);

    $('card-words').addEventListener('click', () => {
      const card = $('card-words');
      card.classList.add('card-shake');
      setTimeout(() => card.classList.remove('card-shake'), 550);
      Sounds.ensure();
      Sounds.tick();
      Speech.speak('משחק האותיות עוד בהכנה. בקרוב! בינתיים בוא נשחק בחשבון!');
    });

    $('btn-back').addEventListener('click', () => { Sounds.click(); goHome(); });
    $('btn-say').addEventListener('click', () => { Sounds.click(); Game.sayQuestion(); });
    $('btn-help').addEventListener('click', () => { Sounds.click(); Game.showHelp(); });
    $('btn-explain-replay').addEventListener('click', () => { Sounds.click(); Game.replayExplain(); });
    $('btn-explain-start').addEventListener('click', () => { Sounds.click(); Game.closeExplain(); });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { save(); Speech.stop(); }
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return { get state() { return state; }, save, refreshHome };
})();

/* חשיפה לבדיקות אוטומטיות */
window.__KG = { App, get Game() { return Game; }, Levels };
