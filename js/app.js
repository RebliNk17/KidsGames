/* ═══════════════ ניהול האפליקציה: מצב, מסכים, הגדרות, PWA ═══════════════ */

const App = (() => {
  const STORAGE_KEY = 'kidsgames-progress-v1';
  const LETTERS_CURRICULUM = 2; // גרסת תוכנית האותיות. עולה כשרמות משתנות - ראה migrate
  const $ = id => document.getElementById(id);

  const GAME_SLICE = () => ({
    maxLevel: 1,       // הרמה הגבוהה שנפתחה (חלון הרמות נגזר ממנה)
    stars: 0,          // התקדמות לרמה הבאה
    explainedUpTo: 0,  // עד איזו רמה כבר הוצג הסבר
    totalStars: 0,
    answered: 0,
    firstTry: 0,
    medals: [],        // רמות שהמבחן אחריהן עבר (5, 10, ...) - מדליות באלבום
    pendingTest: false, // הגיע הזמן למבחן ועוד לא נעשה (נשמר גם אם יצאו באמצע)
    curriculum: LETTERS_CURRICULUM // איזו תוכנית רמות השמירה הזאת מכירה
  });

  const DEFAULT_STATE = () => ({
    v: 2,
    soundOn: true,
    speechOn: true,
    fullscreenOn: false,
    math: GAME_SLICE(),
    letters: GAME_SLICE(),
    thinking: GAME_SLICE()
  });

  /* שני ילדים: הקטן (3) משחק במשחק החשיבה, הגדול (6) בחשבון ובאותיות.
     בוחרים ילד במסך הראשון; ההתקדמות של כל משחק נשמרת בנפרד ממילא. */
  const CHILDREN = {
    3: { icon: '🧸', label: 'גיל 3', games: ['thinking'] },
    6: { icon: '🎒', label: 'גיל 6', games: ['math', 'letters'] }
  };

  let state = load();
  let child = null;          // 3 או 6 - הילד שנבחר במסך הראשון
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
        fullscreenOn: false,
        math: {
          maxLevel: raw.maxLevel || 1,
          stars: raw.stars || 0,
          explainedUpTo: raw.explainedUpTo || 0,
          totalStars: raw.totalStars || 0,
          answered: raw.answered || 0,
          firstTry: raw.firstTry || 0
        },
        letters: GAME_SLICE(),
        thinking: GAME_SLICE()
      };
    }
    // השלמת שדות חסרים בעתיד
    const st = Object.assign(DEFAULT_STATE(), raw);
    st.math = Object.assign(GAME_SLICE(), raw.math);
    st.letters = Object.assign(GAME_SLICE(), raw.letters);
    st.thinking = Object.assign(GAME_SLICE(), raw.thinking);

    // תוכנית האותיות השתנתה (הניקוד ירד, רמות 11 ומעלה חדשות, והרבה יותר תרגילים
    // בכל רמה): שמירה מהתוכנית הישנה חוזרת לרמה 10 - האותיות, הצלילים וההברות
    // שהילד באמת למד נשארים, ואת החומר החדש הוא פוגש עם ההסברים שלו.
    // הכוכבים שנאספו והמדליות לא נוגעים בהם.
    if (!(raw.letters && raw.letters.curriculum)) {
      const L = st.letters;
      if (L.maxLevel > 10) { L.maxLevel = 10; L.stars = 0; L.pendingTest = false; }
      L.explainedUpTo = Math.min(L.explainedUpTo, L.maxLevel - 1); // ההסבר של הרמה הנוכחית יוצג שוב
      L.curriculum = LETTERS_CURRICULUM;
    }
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
    ['screen-who', 'screen-home', 'screen-game'].forEach(id => $(id).classList.add('hidden'));
    $(screenId).classList.remove('hidden');
    document.body.dataset.screen = screenId;
  }

  function goHome() {
    if (activeEngine) activeEngine.stop();
    activeEngine = null;
    if (!child) { show('screen-who'); return; }
    show('screen-home');
    refreshHome();
  }

  /* בחירת ילד: מסך הבית מציג רק את המשחקים והמדבקות שלו */
  function chooseChild(age) {
    child = age;
    document.body.dataset.child = String(age);
    $('switch-icon').textContent = CHILDREN[age].icon;
    $('switch-text').textContent = CHILDREN[age].label;
    Sounds.ensure();
    Sounds.click();
    show('screen-home');
    refreshHome();
  }

  function openGame(engine, opts) {
    Sounds.ensure();
    Sounds.click();
    // הלחיצה על הכרטיס היא מחוות משתמש - מותר לבקש כאן מסך מלא
    if (state.fullscreenOn && fsSupported() && !fsElement()) enterFullscreen();
    activeEngine = engine;
    $('mascot').textContent = { letters: '🦉', thinking: '🐻' }[engine.key] || '🦊';
    $('screen-game').dataset.game = engine.key;
    show('screen-game');
    engine.open(opts);
  }

  /* ─── מסך מלא (עם קידומות webkit/moz/ms לאנדרואיד ודפדפנים ישנים) ─── */

  function fsElement() {
    return document.fullscreenElement || document.webkitFullscreenElement ||
      document.mozFullScreenElement || document.msFullscreenElement || null;
  }

  function fsSupported() {
    const d = document.documentElement;
    return !!(d.requestFullscreen || d.webkitRequestFullscreen ||
      d.mozRequestFullScreen || d.msRequestFullscreen);
  }

  function enterFullscreen() {
    const d = document.documentElement;
    const fn = d.requestFullscreen || d.webkitRequestFullscreen ||
      d.mozRequestFullScreen || d.msRequestFullscreen;
    if (!fn) return;
    try {
      const p = fn.call(d);
      if (p && p.catch) p.catch(() => { });
    } catch (e) { }
    // נעילת המסך לאורך - עובדת רק בתוך מסך מלא, ולא בכל הדפדפנים
    try {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('portrait').catch(() => { });
      }
    } catch (e) { }
  }

  function exitFullscreen() {
    const fn = document.exitFullscreen || document.webkitExitFullscreen ||
      document.webkitCancelFullScreen || document.mozCancelFullScreen ||
      document.msExitFullscreen;
    if (!fn) return;
    try {
      const p = fn.call(document);
      if (p && p.catch) p.catch(() => { });
    } catch (e) { }
  }

  function setupFullscreen() {
    const btn = $('btn-fullscreen');
    if (!fsSupported()) return; // הכפתור נשאר מוסתר (למשל באייפון)
    btn.classList.remove('hidden');

    const sync = () => {
      const on = !!fsElement();
      $('fs-icon-expand').classList.toggle('hidden', on);
      $('fs-icon-compress').classList.toggle('hidden', !on);
    };
    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange']
      .forEach(ev => document.addEventListener(ev, sync));

    btn.addEventListener('click', () => {
      Sounds.click();
      if (fsElement()) {
        state.fullscreenOn = false;
        exitFullscreen();
      } else {
        state.fullscreenOn = true;
        enterFullscreen();
      }
      save();
    });

    // מצב דביק: אם הילד יצא בטעות (מחוות "אחורה" באנדרואיד יוצאת ממסך מלא),
    // הנגיעה הבאה במסך מחזירה אותו. כיבוי אמיתי - דרך הכפתור.
    document.addEventListener('pointerdown', () => {
      if (state.fullscreenOn && !fsElement()) enterFullscreen();
    });
  }

  /* ─── מסך הבית: אלבום המדבקות ─── */

  function stickerRowFor(levels, slice, rowEl, engine = null) {
    const testEvery = (engine && engine.TEST_EVERY) || 0;
    rowEl.innerHTML = '';
    levels.forEach((L, i) => {
      const earned = i < slice.maxLevel - 1;
      const current = i === slice.maxLevel - 1;
      const b = document.createElement('button');
      b.className = 'stkr ' + (earned ? 'earned' : current ? 'current' : 'locked');
      // הטיה קבועה-אקראית לכל מדבקה, כמו באלבום אמיתי
      b.style.setProperty('--tilt', (((i * 37) % 13) - 6) + 'deg');
      if (earned) b.style.animationDelay = (i * 40) + 'ms';
      b.textContent = earned || current ? L.icon : '?';
      b.title = earned || current ? `רמה ${L.id}: ${L.name}` : 'מדבקה נעולה';
      b.addEventListener('click', () => {
        b.classList.remove('boing');
        void b.offsetWidth;
        b.classList.add('boing');
        if (earned) {
          Sounds.sticker();
          Speech.speak(`רמה ${L.id}: ${L.name}!`);
        } else if (current) {
          Sounds.click();
          Speech.speak(`על המדבקה הזאת אתה עובד עכשיו: ${L.name}!`);
        } else {
          Sounds.tick();
        }
      });
      rowEl.appendChild(b);

      // אחרי כל בלוק רמות - מדליה על המבחן
      if (testEvery && L.id % testEvery === 0) rowEl.appendChild(medalFor(L.id, testEvery, slice, engine));
    });
  }

  /* מדליית מבחן. מדליה שלא נאספה אבל הרמות שלה כבר מאחורינו (למשל ילד שהתקדם
     לפני שהמבחנים היו קיימים) נשארת פתוחה: לוחצים עליה ונכנסים ישר לאותו מבחן. */
  function medalFor(levelId, testEvery, slice, engine) {
    const got = (slice.medals || []).includes(levelId);
    const avail = !got && engine && engine.testAvailable && engine.testAvailable(levelId);
    const lo = levelId - testEvery + 1;
    const m = document.createElement('button');
    m.className = 'stkr medal ' + (got ? 'earned' : avail ? 'ready' : 'locked');
    m.textContent = '🏅';
    m.title = got ? `מדליה: עברת את המבחן על רמות ${lo}-${levelId}`
      : avail ? `לחץ כדי לעשות את המבחן על רמות ${lo}-${levelId} ולקבל מדליה`
        : `מדליה נעולה: עוברים את המבחן של רמות ${lo}-${levelId}`;
    m.addEventListener('click', () => {
      m.classList.remove('boing');
      void m.offsetWidth;
      m.classList.add('boing');
      if (got) {
        Sounds.sticker();
        Speech.speak(`מדליה! עברת את המבחן על רמות ${lo} עד ${levelId}!`);
      } else if (avail) {
        Speech.speak(`המדליה הזאת מחכה לך! עושים את המבחן על רמות ${lo} עד ${levelId}.`);
        openGame(engine, { testFor: levelId });
      } else {
        Sounds.tick();
        Speech.speak(`מדליה למי שעובר את המבחן על רמות ${lo} עד ${levelId}!`);
      }
    });
    return m;
  }

  function refreshHome() {
    // מוקשח: תקלה קוסמטית כאן לא תפיל את שאר האפליקציה
    try {
      const ML = Levels.LEVELS, LL = LettersLevels.LEVELS, TL = ThinkingLevels.LEVELS;

      $('math-card-info').textContent =
        `רמה ${state.math.maxLevel} מתוך ${ML.length} · ${ML[state.math.maxLevel - 1].name}`;
      $('letters-card-info').textContent =
        `רמה ${state.letters.maxLevel} מתוך ${LL.length} · ${LL[state.letters.maxLevel - 1].name}`;
      $('thinking-card-info').textContent =
        `רמה ${state.thinking.maxLevel} מתוך ${TL.length} · ${TL[state.thinking.maxLevel - 1].name}`;

      stickerRowFor(ML, state.math, $('sticker-row-math'), MathGame);
      stickerRowFor(LL, state.letters, $('sticker-row-letters'), LettersGame);
      stickerRowFor(TL, state.thinking, $('sticker-row-thinking'), ThinkingGame);

      // סך הכוכבים של המשחקים של הילד שנבחר
      const games = (CHILDREN[child] || { games: ['math', 'letters', 'thinking'] }).games;
      const total = games.reduce((sum, g) => sum + state[g].totalStars, 0);
      $('total-stars').textContent = total > 0 ? `אספת ${total} ⭐ עד עכשיו!` : 'שחק ואסוף מדבקות וכוכבים! ✨';
    } catch (e) { /* מסך הבית תמיד חייב להישאר לחיץ */ }
  }

  /* ─── רקע מונפש ─── */

  function makeBubbles() {
    const box = $('bg-bubbles');
    const icons = ['⭐', '🎈', '☁️', '✨', '🔢', '➕', '💜', '🌈', 'א', 'ב', '🧩', '🐻'];
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
    $('set-lvl3-val').textContent = String(state.thinking.maxLevel);

    const tAns = state.math.answered + state.letters.answered + state.thinking.answered;
    const tFirst = state.math.firstTry + state.letters.firstTry + state.thinking.firstTry;
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
    levelAdjuster('set-lvl3-down', 'set-lvl3-up', () => state.thinking, () => ThinkingGame, ThinkingLevels.LEVELS.length);

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
    // קודם כל מחווטים את הכפתורים החיוניים - שום שגיאה בהמשך האתחול
    // לא תשאיר מסך שאי אפשר ללחוץ עליו (לקח מתקלת גרסאות אמיתית!)
    $('who-3').addEventListener('click', () => chooseChild(3));
    $('who-6').addEventListener('click', () => chooseChild(6));
    $('btn-switch').addEventListener('click', () => { Sounds.click(); child = null; show('screen-who'); });
    $('card-thinking').addEventListener('click', () => openGame(ThinkingGame));
    $('card-math').addEventListener('click', () => openGame(MathGame));
    $('card-words').addEventListener('click', () => openGame(LettersGame));
    $('btn-back').addEventListener('click', () => { Sounds.click(); goHome(); });
    $('btn-say').addEventListener('click', () => { Sounds.click(); activeEngine && activeEngine.sayQuestion(); });
    $('btn-help').addEventListener('click', () => { Sounds.click(); activeEngine && activeEngine.showHelp(); });
    $('btn-explain-replay').addEventListener('click', () => { Sounds.click(); activeEngine && activeEngine.replayExplain(); });
    $('btn-explain-start').addEventListener('click', () => { Sounds.click(); activeEngine && activeEngine.closeExplain(); });
    $('btn-explain-cancel').addEventListener('click', () => { Sounds.click(); activeEngine && activeEngine.cancelExplain(); });

    Speech.init();
    Sounds.setEnabled(state.soundOn);
    Speech.setEnabled(state.speechOn);
    Speech.setTalkListener(talking => {
      $('mascot').classList.toggle('talking', talking);
    });

    try { makeBubbles(); } catch (e) { }
    show('screen-who');
    refreshHome();
    setupParentGate();
    setupSettings();
    setupInstall();
    setupFullscreen();
    registerSW();
    MathGame.init();

    document.addEventListener('pointerdown', () => Sounds.ensure(), { once: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { save(); Speech.stop(); }
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    get state() { return state; },
    get activeEngine() { return activeEngine; },
    get child() { return child; },
    chooseChild,
    save,
    refreshHome,
    goHome
  };
})();

/* חשיפה לבדיקות אוטומטיות */
window.__KG = {
  App,
  get Game() { return MathGame; },
  get LettersGame() { return LettersGame; },
  get ThinkingGame() { return ThinkingGame; },
  Levels,
  get LettersLevels() { return LettersLevels; },
  get ThinkingLevels() { return ThinkingLevels; }
};
