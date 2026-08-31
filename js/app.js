/* ═══════════════ ניהול האפליקציה: מצב, מסכים, הגדרות, PWA ═══════════════ */

const App = (() => {
  const STORAGE_KEY = 'kidsgames-progress-v1';
  const $ = id => document.getElementById(id);

  const GAME_SLICE = () => ({
    maxLevel: 1,       // הרמה הגבוהה שנפתחה (חלון הרמות נגזר ממנה)
    stars: 0,          // התקדמות לרמה הבאה
    explainedUpTo: 0,  // עד איזו רמה כבר הוצג הסבר
    totalStars: 0,
    answered: 0,
    firstTry: 0
  });

  const DEFAULT_STATE = () => ({
    v: 2,
    soundOn: true,
    speechOn: true,
    math: GAME_SLICE(),
    letters: GAME_SLICE()
  });

  let state = load();
  let deferredInstall = null;
  let activeEngine = null;

  /* ─── שמירה, טעינה ומיגרציה ─── */

  function migrate(raw) {
    if (!raw.v || raw.v === 1) {
      // גרסה 1: התקדמות החשבון ישבה בשורש - מעבירים לפרוסה, שומרים הכול
      return {
        v: 2,
        soundOn: raw.soundOn !== false,
        speechOn: raw.speechOn !== false,
        math: {
          maxLevel: raw.maxLevel || 1,
          stars: raw.stars || 0,
          explainedUpTo: raw.explainedUpTo || 0,
          totalStars: raw.totalStars || 0,
          answered: raw.answered || 0,
          firstTry: raw.firstTry || 0
        },
        letters: GAME_SLICE()
      };
    }
    // השלמת שדות חסרים בעתיד
    const st = Object.assign(DEFAULT_STATE(), raw);
    st.math = Object.assign(GAME_SLICE(), raw.math);
    st.letters = Object.assign(GAME_SLICE(), raw.letters);
    return st;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return migrate(JSON.parse(raw));
    } catch (e) { /* אחסון חסום - משחקים בלי שמירה */ }
    return DEFAULT_STATE();
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
    if (activeEngine) activeEngine.stop();
    activeEngine = null;
    show('screen-home');
    refreshHome();
  }

  function openGame(engine) {
    Sounds.ensure();
    Sounds.click();
    activeEngine = engine;
    $('mascot').textContent = engine.key === 'letters' ? '🦉' : '🦊';
    show('screen-game');
    engine.open();
  }

  /* ─── מסך הבית ─── */

  function stickerRowFor(levels, slice, rowEl) {
    rowEl.innerHTML = '';
    for (let i = 0; i < levels.length; i++) {
      const done = i < slice.maxLevel - 1;
      const current = i === slice.maxLevel - 1;
      if (!done && !current) continue;
      const s = document.createElement('span');
      s.className = 'sticker' + (current ? ' pending' : '');
      s.textContent = levels[i].icon;
      s.style.animationDelay = (i * 60) + 'ms';
      s.title = levels[i].name;
      rowEl.appendChild(s);
    }
  }

  function refreshHome() {
    const ML = Levels.LEVELS, LL = LettersLevels.LEVELS;

    $('math-card-info').textContent =
      `רמה ${state.math.maxLevel} מתוך ${ML.length} · ${ML[state.math.maxLevel - 1].name}`;
    $('letters-card-info').textContent =
      `רמה ${state.letters.maxLevel} מתוך ${LL.length} · ${LL[state.letters.maxLevel - 1].name}`;

    stickerRowFor(ML, state.math, $('sticker-row-math'));
    stickerRowFor(LL, state.letters, $('sticker-row-letters'));

    const total = state.math.totalStars + state.letters.totalStars;
    $('total-stars').textContent = total > 0 ? `אספת ${total} ⭐ עד עכשיו!` : 'שחק ואסוף מדבקות וכוכבים! ✨';
  }

  /* ─── רקע מונפש ─── */

  function makeBubbles() {
    const box = $('bg-bubbles');
    const icons = ['⭐', '🎈', '☁️', '✨', '🔢', '➕', '💜', '🌈', 'א', 'ב'];
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

    $('set-lvl-val').textContent = String(state.math.maxLevel);
    $('set-lvl2-val').textContent = String(state.letters.maxLevel);

    const tAns = state.math.answered + state.letters.answered;
    const tFirst = state.math.firstTry + state.letters.firstTry;
    const acc = tAns ? Math.round(100 * tFirst / tAns) : 0;
    $('set-stats').textContent =
      `ענה על ${tAns} תרגילים · ${tFirst} נכונים בניסיון ראשון (${acc}%)`;
    if (Speech.supported && !Speech.hasHebrewVoice()) {
      $('set-stats').textContent += ' · ⚠️ לא נמצא קול עברי במכשיר';
    }
  }

  function levelAdjuster(btnDownId, btnUpId, slice, engine, maxLevels) {
    $(btnDownId).addEventListener('click', () => {
      if (slice().maxLevel > 1) {
        slice().maxLevel--;
        engine().applyLevelChange();
        updateSettingsUI();
      }
    });
    $(btnUpId).addEventListener('click', () => {
      if (slice().maxLevel < maxLevels) {
        slice().maxLevel++;
        engine().applyLevelChange();
        updateSettingsUI();
      }
    });
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
      Speech.speak('שלום! ככה אני נשמע. בוא נלמד ביחד!');
    });

    levelAdjuster('set-lvl-down', 'set-lvl-up', () => state.math, () => MathGame, Levels.LEVELS.length);
    levelAdjuster('set-lvl2-down', 'set-lvl2-up', () => state.letters, () => LettersGame, LettersLevels.LEVELS.length);

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
    MathGame.init();

    document.addEventListener('pointerdown', () => Sounds.ensure(), { once: true });

    $('card-math').addEventListener('click', () => openGame(MathGame));
    $('card-words').addEventListener('click', () => openGame(LettersGame));

    $('btn-back').addEventListener('click', () => { Sounds.click(); goHome(); });
    $('btn-say').addEventListener('click', () => { Sounds.click(); activeEngine && activeEngine.sayQuestion(); });
    $('btn-help').addEventListener('click', () => { Sounds.click(); activeEngine && activeEngine.showHelp(); });
    $('btn-explain-replay').addEventListener('click', () => { Sounds.click(); activeEngine && activeEngine.replayExplain(); });
    $('btn-explain-start').addEventListener('click', () => { Sounds.click(); activeEngine && activeEngine.closeExplain(); });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { save(); Speech.stop(); }
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    get state() { return state; },
    get activeEngine() { return activeEngine; },
    save,
    refreshHome
  };
})();

/* חשיפה לבדיקות אוטומטיות */
window.__KG = {
  App,
  get Game() { return MathGame; },
  get LettersGame() { return LettersGame; },
  Levels,
  get LettersLevels() { return LettersLevels; }
};
