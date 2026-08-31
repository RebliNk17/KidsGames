/* ═══════════════ מנוע המשחקים המשותף ═══════════════
 * כל משחק (חשבון, אותיות...) הוא קונפיגורציה של המנוע הזה.
 * המנוע מנהל: חלון רמות מתגלגל, כוכבים ועליית רמה, נעילת "זמן חשיבה",
 * סולם רמזים אחרי טעויות, חלון הסבר קולי, ושמירת התקדמות.
 *
 * config = {
 *   key            'math' | 'letters' - שם פרוסת המצב ב-App.state
 *   levels         מערך רמות: {id, name, icon, explain, demo(), gen()}
 *   renderQuestion (q, els, reveal) - מציירת את השאלה. els={promptEl, visualEl, exprEl}
 *   revealAnswer   (q, els) - עדכון עדין של התצוגה כשנענתה נכון (בלי רינדור מלא)
 *   optionClass    (q) - מחלקת CSS לכפתורי התשובה
 *   optionContent  (q, value) - תוכן כפתור תשובה (Node או string)
 *   optionColumns  (q) - ערך grid-template-columns
 *   build          {render(q, els, api)} - אינטראקציית בנייה (לא כפתורי בחירה), אופציונלי
 *   defaultRevealSpeech (q) - מה מקריאים כשחושפים את התשובה (אם אין q.revealSpeech)
 *   champSpeech    מה אומרים כשמסיימים את כל הרמות
 * }
 */

function createEngine(config) {
  const LEVELS = config.levels;

  /* ─── כוונון ─── */
  const STARS_PER_LEVEL = config.starsPerLevel || 7;
  const WINDOW_SIZE = config.windowSize || 5;
  const THINK_MS = config.thinkMs || 3000;
  const RETRY_MS = config.retryMs || 4000;
  const RING_LEN = 276.5;

  const PRAISE = ['כל הכבוד!', 'מעולה!', 'איזה יופי!', 'נכון מאוד!', 'אלוף!', 'מדהים!', 'וואו, נכון!'];
  const ENCOURAGE = ['אופס, בוא ננסה שוב!', 'לא נורא, נסה עוד פעם!', 'כמעט! עוד ניסיון!'];

  /* ─── מצב פנימי ─── */
  let q = null;
  let attempts = 0;
  let locked = true;
  let resolving = false;
  let revealMode = false;
  let freshLeft = 0;
  let explainCtx = null;
  let lockTimer = null, nextTimer = null, flyTimer = null, toastTimer = null;

  const $ = id => document.getElementById(id);
  const S = () => App.state[config.key];

  const els = () => ({
    promptEl: $('q-prompt'),
    visualEl: $('q-visual'),
    exprEl: $('q-expr')
  });

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  /* ─── חלון הרמות המתגלגל ─── */
  function windowLevels() {
    const hi = S().maxLevel;
    const lo = Math.max(1, hi - (WINDOW_SIZE - 1));
    const arr = [];
    for (let l = lo; l <= hi; l++) arr.push(l);
    return arr;
  }

  function pickLevel() {
    const win = windowLevels();
    const weights = win.map((_, i) => i + 1 + (i === win.length - 1 ? 2 : 0));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < win.length; i++) {
      r -= weights[i];
      if (r <= 0) return win[i];
    }
    return win[win.length - 1];
  }

  /* ─── נעילת זמן חשיבה ─── */
  function lock(ms) {
    locked = true;
    clearTimeout(lockTimer);
    $('options').classList.add('locked');
    const tl = $('think-lock');
    tl.classList.remove('hidden');
    const ring = $('ring-fg');
    ring.style.transition = 'none';
    ring.style.strokeDashoffset = '0';
    void ring.getBoundingClientRect();
    ring.style.transition = `stroke-dashoffset ${ms}ms linear`;
    ring.style.strokeDashoffset = String(RING_LEN);
    lockTimer = setTimeout(unlock, ms);
  }

  function unlock() {
    locked = false;
    $('options').classList.remove('locked');
    $('think-lock').classList.add('hidden');
    Sounds.unlock();
    document.querySelectorAll('#options .opt:not(.spent), #options .tile:not(.used)').forEach(b => {
      b.classList.add('unlock-bounce');
      setTimeout(() => b.classList.remove('unlock-bounce'), 450);
    });
  }

  function toast(msg, ms = 1500) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), ms);
  }

  function lockedFeedback(elm) {
    elm.classList.add('wobble');
    setTimeout(() => elm.classList.remove('wobble'), 380);
    Sounds.tick();
    toast('רגע... קודם חושבים 🤔');
  }

  function mascotHappy() {
    const m = $('mascot');
    m.classList.remove('happy');
    void m.offsetWidth;
    m.classList.add('happy');
  }

  /* ─── תשובות: מסלול כפתורי בחירה ─── */
  function renderOptions(qq) {
    const box = $('options');
    box.innerHTML = '';
    box.style.gridTemplateColumns = config.optionColumns(qq);
    qq.options.forEach(val => {
      const b = el('button', 'opt ' + (config.optionClass(qq) || ''));
      b.dataset.value = String(val);
      const content = config.optionContent(qq, val);
      if (typeof content === 'string') b.textContent = content;
      else b.appendChild(content);
      b.addEventListener('click', () => selectOption(b, val));
      box.appendChild(b);
    });
  }

  function selectOption(btn, val) {
    if (resolving) return;
    if (locked && !revealMode) { lockedFeedback(btn); return; }
    if (revealMode && String(val) !== String(q.answer)) return;
    Sounds.click();
    if (String(val) === String(q.answer)) onCorrect(btn);
    else onWrong(btn);
  }

  function onCorrect(anchorEl) {
    resolving = true;
    clearTimeout(lockTimer);
    $('think-lock').classList.add('hidden');
    $('options').classList.remove('locked');

    const st = S();
    const firstTry = attempts === 0 && !revealMode;

    if (anchorEl && anchorEl.classList.contains('opt')) anchorEl.classList.add('good');
    const r = (anchorEl || $('question-area')).getBoundingClientRect();
    Confetti.burst(r.left + r.width / 2, r.top + r.height / 2);
    Sounds.correct();
    mascotHappy();

    config.revealAnswer(q, els());

    st.answered++;
    if (firstTry) {
      st.firstTry++;
      st.stars++;
      st.totalStars++;
      const slot = $('star-meter').children[st.stars - 1];
      if (slot) {
        flyTimer = setTimeout(() => {
          Confetti.flyStar(r, slot.getBoundingClientRect(), () => {
            slot.classList.add('full');
            Sounds.star();
          });
        }, 350);
      }
      if (Math.random() < 0.5) Speech.speak(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
    } else if (Math.random() < 0.35) {
      Speech.speak('נכון! ממשיכים!');
    }
    App.save();

    nextTimer = setTimeout(() => {
      if (st.stars >= STARS_PER_LEVEL) levelUp();
      else nextQuestion();
    }, 1900);
  }

  function onWrong(btn) {
    attempts++;
    Sounds.wrong();
    btn.classList.add('bad');
    setTimeout(() => { btn.classList.remove('bad'); btn.classList.add('spent'); }, 550);

    const remaining = [...document.querySelectorAll('#options .opt')]
      .filter(b => !b.classList.contains('spent') && b !== btn).length;

    if (remaining <= 1 || attempts >= 3) {
      revealAnswerBtn();
      return;
    }
    speakWrongLadder();
    lock(RETRY_MS);
  }

  /* טעות ראשונה - עידוד, שנייה - רמז אמיתי */
  function speakWrongLadder() {
    if (attempts === 1) Speech.speak(ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)]);
    else Speech.speak('הנה רמז: ' + q.hint);
  }

  function revealAnswerBtn() {
    revealMode = true;
    locked = false;
    clearTimeout(lockTimer);
    $('think-lock').classList.add('hidden');
    $('options').classList.remove('locked');
    document.querySelectorAll('#options .opt').forEach(b => {
      if (b.dataset.value === String(q.answer)) b.classList.add('reveal');
      else b.classList.add('spent');
    });
    Speech.speak(q.revealSpeech || config.defaultRevealSpeech(q));
  }

  /* ─── תשובות: מסלול בנייה (למשל הרכבת מילה מאותיות) ─── */
  const buildApi = {
    isLocked: () => locked,
    lockedFeedback,
    miss(elm, { lockMs = 2000 } = {}) {
      attempts++;
      Sounds.wrong();
      if (elm) {
        elm.classList.add('bad');
        setTimeout(() => elm.classList.remove('bad'), 550);
      }
      speakWrongLadder();
      lock(lockMs);
      return attempts; // המפעיל מחליט אם להדגיש את הצעד הבא
    },
    stepSound(n) { Sounds.count(n); },
    done(anchorEl) { onCorrect(anchorEl); },
    question: () => q
  };

  /* ─── זרימת תרגילים ─── */
  function nextQuestion() {
    attempts = 0;
    resolving = false;
    revealMode = false;

    let lvl;
    if (freshLeft > 0) { lvl = S().maxLevel; freshLeft--; }
    else lvl = pickLevel();

    q = LEVELS[lvl - 1].gen();
    q.levelId = lvl;

    const area = $('question-area');
    area.style.animation = 'none';
    void area.offsetHeight;
    area.style.animation = '';

    config.renderQuestion(q, els(), false);

    const box = $('options');
    if (q.kind === 'build' && config.build) {
      box.innerHTML = '';
      box.style.gridTemplateColumns = '';
      config.build.render(q, { ...els(), optionsEl: box }, buildApi);
    } else {
      renderOptions(q);
    }

    updateTopbar();
    Speech.speak(q.speech);
    lock(THINK_MS);
  }

  function updateTopbar() {
    const st = S();
    const L = LEVELS[st.maxLevel - 1];
    $('level-badge').textContent = `רמה ${st.maxLevel} ${L.icon}`;
    const meter = $('star-meter');
    meter.innerHTML = '';
    for (let i = 0; i < STARS_PER_LEVEL; i++) {
      meter.appendChild(el('span', 'star-slot' + (i < st.stars ? ' full' : ''), '⭐'));
    }
  }

  /* ─── עליית רמה ─── */
  function levelUp() {
    const st = S();
    Sounds.levelup();
    Confetti.rain();
    mascotHappy();

    if (st.maxLevel < LEVELS.length) {
      st.maxLevel++;
      st.stars = 0;
      App.save();
      updateTopbar();
      App.refreshHome();
      nextTimer = setTimeout(() => showExplain(st.maxLevel, 'intro'), 900);
    } else {
      st.stars = 0;
      App.save();
      updateTopbar();
      Speech.speak(config.champSpeech);
      toast('🏆 אלוף על! 🏆', 2600);
      nextTimer = setTimeout(nextQuestion, 3000);
    }
  }

  /* ─── חלון הסבר ─── */
  function explainSpeechText(levelId) {
    const L = LEVELS[levelId - 1];
    const isNew = explainCtx === 'intro' && levelId > 1;
    return (isNew ? 'רמה חדשה! ' : '') + L.name + '. ' + L.explain;
  }

  function showExplain(levelId, ctx) {
    explainCtx = ctx;
    const L = LEVELS[levelId - 1];
    $('explain-banner').classList.toggle('hidden', !(ctx === 'intro' && levelId > 1));
    $('explain-icon').textContent = L.icon;
    $('explain-name').textContent = `רמה ${levelId}: ${L.name}`;
    $('explain-text').textContent = L.explain;

    const demoBox = $('explain-demo');
    demoBox.innerHTML = '';
    if (L.demoRender) {
      // דוגמה מיוחדת לרמה (למשל כרטיסי אותיות שאפשר ללחוץ ולשמוע)
      L.demoRender(demoBox);
    } else {
      const p = el('div', 'q-prompt'), v = el('div', 'q-visual'), x = el('div', 'q-expr ltr');
      demoBox.append(p, v, x);
      const dq = L.demo();
      dq.levelId = levelId;
      config.renderQuestion(dq, { promptEl: p, visualEl: v, exprEl: x }, true);
    }

    $('overlay-explain').classList.remove('hidden');
    setTimeout(() => Speech.speak(explainSpeechText(levelId)), 350);
  }

  function replayExplain() {
    const levelId = explainCtx === 'help' && q ? q.levelId : S().maxLevel;
    Speech.speak(explainSpeechText(levelId));
  }

  function closeExplain() {
    $('overlay-explain').classList.add('hidden');
    Speech.stop();
    if (explainCtx === 'intro') {
      const st = S();
      st.explainedUpTo = Math.max(st.explainedUpTo, st.maxLevel);
      App.save();
      freshLeft = 2;
      nextQuestion();
    } else if (q) {
      Speech.speak(q.speech);
    }
    explainCtx = null;
  }

  /* ─── API ─── */
  return {
    open() {
      updateTopbar();
      if (S().explainedUpTo < S().maxLevel) showExplain(S().maxLevel, 'intro');
      else nextQuestion();
    },

    stop() {
      clearTimeout(lockTimer);
      clearTimeout(nextTimer);
      clearTimeout(flyTimer);
      Speech.stop();
    },

    sayQuestion() {
      if (q) Speech.speak(q.speech, { rate: q.replayRate || 0.92 });
    },

    showHelp() {
      if (q) showExplain(q.levelId, 'help');
    },

    replayExplain,
    closeExplain,

    applyLevelChange() {
      const st = S();
      st.stars = 0;
      st.explainedUpTo = st.maxLevel;
      freshLeft = 0;
      App.save();
      if (!$('screen-game').classList.contains('hidden') && App.activeEngine === this) {
        updateTopbar();
        nextQuestion();
      }
    },

    current() { return q; },
    key: config.key,
    STARS_PER_LEVEL
  };
}
