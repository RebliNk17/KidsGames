/* ═══════════════ מנוע משחק החשבון ═══════════════
 * חלון רמות מתגלגל, נעילת "זמן חשיבה" נגד ניחושים,
 * כוכבים, עליית רמה עם הסבר קולי, ורמזים.
 */

const Game = (() => {
  const LEVELS = Levels.LEVELS;

  /* ─── כוונון ─── */
  const STARS_PER_LEVEL = 7;   // כוכבים (תשובות נכונות בניסיון ראשון) לעליית רמה
  const WINDOW_SIZE = 5;       // כמה רמות פעילות בו-זמנית
  const THINK_MS = 3000;       // זמן חשיבה חובה לפני שאפשר לענות
  const RETRY_MS = 4000;       // זמן חשיבה אחרי טעות
  const RING_LEN = 276.5;      // היקף טבעת ההמתנה (2πr, r=44)

  const PRAISE = ['כל הכבוד!', 'מעולה!', 'איזה יופי!', 'נכון מאוד!', 'אלוף!', 'מדהים!', 'וואו, נכון!'];
  const ENCOURAGE = ['אופס, בוא ננסה שוב!', 'לא נורא, נסה עוד פעם!', 'כמעט! עוד ניסיון!'];

  /* ─── מצב פנימי ─── */
  let q = null;            // התרגיל הנוכחי
  let attempts = 0;        // טעויות בתרגיל הנוכחי
  let locked = true;       // האם הכפתורים נעולים (זמן חשיבה)
  let resolving = false;   // באמצע אנימציית "נכון"
  let revealMode = false;  // התשובה הנכונה מודגשת אחרי יותר מדי טעויות
  let freshLeft = 0;       // כמה תרגילים הבאים חייבים להיות מהרמה החדשה
  let countN = 0;          // מונה ספירת חפצים בלחיצה
  let explainCtx = null;   // 'intro' | 'help'
  let lockTimer = null, nextTimer = null, flyTimer = null, toastTimer = null;

  const $ = id => document.getElementById(id);

  /* ─── חלון הרמות ─── */
  function windowLevels() {
    const S = App.state;
    const hi = S.maxLevel;
    const lo = Math.max(1, hi - (WINDOW_SIZE - 1));
    const arr = [];
    for (let l = lo; l <= hi; l++) arr.push(l);
    return arr;
  }

  /* בחירת רמה מהחלון - לרמות חדשות סיכוי גבוה יותר */
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

  /* ─── רינדור תרגיל ─── */

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function buildObjGrid(emoji, count, { startDelay = 0, flyLast = 0 } = {}) {
    const grid = el('div', 'obj-grid');
    grid.style.gridTemplateColumns = `repeat(${Math.min(count, 5)}, auto)`;
    for (let i = 0; i < count; i++) {
      const o = el('span', 'obj', emoji);
      o.style.animationDelay = (startDelay + i * 70) + 'ms';
      if (i >= count - flyLast) o.dataset.fly = '1';
      grid.appendChild(o);
    }
    return grid;
  }

  function buildBlocks(part) {
    const box = el('div', 'block-num');
    if (part.tens > 0) {
      const bars = el('div', 'tens-bars');
      for (let i = 0; i < part.tens; i++) {
        const b = el('div', 'ten-bar');
        b.style.animationDelay = (i * 80) + 'ms';
        bars.appendChild(b);
      }
      box.appendChild(bars);
    }
    if (part.units > 0) {
      const dots = el('div', 'unit-dots');
      for (let i = 0; i < part.units; i++) {
        const d = el('div', 'unit-dot');
        d.style.animationDelay = (part.tens * 80 + i * 60) + 'ms';
        dots.appendChild(d);
      }
      box.appendChild(dots);
    }
    return box;
  }

  function renderVisual(container, qq) {
    container.innerHTML = '';
    const v = qq.visual;
    if (!v) {
      if (qq.kind === 'seq') {
        const row = el('div', 'seq-row');
        qq.seq.forEach((n, i) => {
          const b = el('div', 'seq-box' + (n === null ? ' missing' : ''), n === null ? '?' : String(n));
          b.style.animationDelay = (i * 90) + 'ms';
          row.appendChild(b);
        });
        container.appendChild(row);
      }
      return;
    }

    if (v.type === 'objects') {
      container.appendChild(buildObjGrid(v.emoji, v.count));
    }

    if (v.type === 'sub') {
      container.appendChild(buildObjGrid(v.emoji, v.total, { flyLast: v.take }));
      // אחרי רגע - החלק שמורידים עף מהמסך
      setTimeout(() => {
        if (App.state.soundOn) Sounds.whoosh();
        container.querySelectorAll('[data-fly]').forEach((o, i) => {
          setTimeout(() => o.classList.add('flyaway'), i * 130);
        });
      }, 1100);
    }

    if (v.type === 'groups') {
      const row = el('div', 'groups-row');
      v.groups.forEach((g, gi) => {
        if (gi > 0 && v.op === '+') row.appendChild(el('span', 'group-op', '+'));
        const box = el('div', 'group-box');
        box.appendChild(buildObjGrid(g.emoji, g.count, { startDelay: gi * 200 }));
        row.appendChild(box);
      });
      container.appendChild(row);
    }

    if (v.type === 'blocks') {
      const row = el('div', 'blocks-row');
      v.parts.forEach((p, pi) => {
        if (pi > 0) row.appendChild(el('span', 'group-op', v.op));
        row.appendChild(buildBlocks(p));
      });
      container.appendChild(row);
    }
  }

  function renderExpr(container, qq, reveal) {
    container.innerHTML = '';
    if (qq.kind !== 'expr') return;
    qq.tokens.forEach(t => {
      let cls = 'tok', text = String(t);
      if (t === '?') {
        if (reveal) { cls += ' revealed'; text = String(qq.answer); }
        else { cls += ' q-mark'; text = '?'; }
      } else if (typeof t === 'string') {
        cls += ' op';
      }
      container.appendChild(el('span', cls, text));
    });
  }

  /* רינדור משותף - למסך המשחק ולדוגמה שבחלון ההסבר */
  function renderQuestionInto(qq, promptEl, visualEl, exprEl, reveal = false) {
    promptEl.textContent = qq.prompt || '';
    renderVisual(visualEl, qq);
    renderExpr(exprEl, qq, reveal);
    if (qq.kind === 'seq' && reveal) {
      const miss = visualEl.querySelector('.seq-box.missing');
      if (miss) { miss.textContent = String(qq.answer); miss.classList.add('revealed'); }
    }
  }

  function renderOptions(qq) {
    const box = $('options');
    box.innerHTML = '';
    // 3 אפשרויות בשורה אחת, 4 אפשרויות ברשת 2×2 נוחה
    box.style.gridTemplateColumns = qq.options.length === 3 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)';
    qq.options.forEach(val => {
      const b = el('button', 'opt');
      b.dataset.value = String(val);
      if (qq.kind === 'compare') {
        b.classList.add('compare-card');
        b.appendChild(el('span', 'cmp-num', String(val)));
        const dots = el('span', 'cmp-dots');
        for (let i = 0; i < val; i++) dots.appendChild(el('span', 'cmp-dot'));
        b.appendChild(dots);
      } else {
        b.textContent = String(val);
      }
      b.addEventListener('click', () => selectOption(b, val));
      box.appendChild(b);
    });
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
    document.querySelectorAll('#options .opt:not(.spent)').forEach(b => {
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

  /* ─── טיפול בתשובות ─── */

  function selectOption(btn, val) {
    if (resolving) return;

    if (locked && !revealMode) {
      btn.classList.add('wobble');
      setTimeout(() => btn.classList.remove('wobble'), 380);
      Sounds.tick();
      toast('רגע... קודם חושבים 🤔');
      return;
    }

    if (revealMode && val !== q.answer) return;
    Sounds.click();
    if (val === q.answer) onCorrect(btn);
    else onWrong(btn);
  }

  function onCorrect(btn) {
    resolving = true;
    clearTimeout(lockTimer);
    $('think-lock').classList.add('hidden');
    $('options').classList.remove('locked');

    const S = App.state;
    const firstTry = attempts === 0 && !revealMode;

    btn.classList.add('good');
    const r = btn.getBoundingClientRect();
    Confetti.burst(r.left + r.width / 2, r.top + r.height / 2);
    Sounds.correct();
    mascotHappy();

    // חשיפת התשובה בתוך התרגיל עצמו
    renderExpr($('q-expr'), q, true);
    if (q.kind === 'seq') {
      const miss = document.querySelector('#q-visual .seq-box.missing');
      if (miss) { miss.textContent = String(q.answer); miss.classList.add('revealed'); }
    }

    S.answered++;
    if (firstTry) {
      S.firstTry++;
      S.stars++;
      S.totalStars++;
      const slot = $('star-meter').children[S.stars - 1];
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
      if (S.stars >= STARS_PER_LEVEL) levelUp();
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
      revealAnswer();
      return;
    }

    if (attempts === 1) {
      Speech.speak(ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)]);
    } else {
      Speech.speak('הנה רמז: ' + q.hint);
    }
    lock(RETRY_MS);
  }

  function revealAnswer() {
    revealMode = true;
    locked = false;
    clearTimeout(lockTimer);
    $('think-lock').classList.add('hidden');
    $('options').classList.remove('locked');
    document.querySelectorAll('#options .opt').forEach(b => {
      if (Number(b.dataset.value) === q.answer) b.classList.add('reveal');
      else b.classList.add('spent');
    });
    Speech.speak(`התשובה הנכונה היא ${q.answer}. לחץ עליה ונמשיך!`);
  }

  /* ─── זרימת תרגילים ─── */

  function nextQuestion() {
    const S = App.state;
    attempts = 0;
    resolving = false;
    revealMode = false;
    countN = 0;

    let lvl;
    if (freshLeft > 0) { lvl = S.maxLevel; freshLeft--; }
    else lvl = pickLevel();

    q = LEVELS[lvl - 1].gen();
    q.levelId = lvl;

    // הפעלת אנימציית הכניסה מחדש
    const area = $('question-area');
    area.style.animation = 'none';
    void area.offsetHeight;
    area.style.animation = '';

    renderQuestionInto(q, $('q-prompt'), $('q-visual'), $('q-expr'));
    renderOptions(q);
    updateTopbar();
    Speech.speak(q.speech);
    lock(THINK_MS);
  }

  function updateTopbar() {
    const S = App.state;
    const L = LEVELS[S.maxLevel - 1];
    $('level-badge').textContent = `רמה ${S.maxLevel} ${L.icon}`;
    const meter = $('star-meter');
    meter.innerHTML = '';
    for (let i = 0; i < STARS_PER_LEVEL; i++) {
      const s = el('span', 'star-slot' + (i < S.stars ? ' full' : ''), '⭐');
      meter.appendChild(s);
    }
  }

  /* ─── עליית רמה ─── */

  function levelUp() {
    const S = App.state;
    Sounds.levelup();
    Confetti.rain();
    mascotHappy();

    if (S.maxLevel < LEVELS.length) {
      S.maxLevel++;
      S.stars = 0;
      App.save();
      updateTopbar();
      App.refreshHome();
      nextTimer = setTimeout(() => showExplain(S.maxLevel, 'intro'), 900);
    } else {
      S.stars = 0;
      App.save();
      updateTopbar();
      Speech.speak('סיימת את כל הרמות! אתה אלוף חשבון אמיתי! ממשיכים להתאמן כמו גדולים.');
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

    // דוגמה חיה עם התשובה גלויה
    const demoBox = $('explain-demo');
    demoBox.innerHTML = '';
    const p = el('div', 'q-prompt'), v = el('div', 'q-visual'), x = el('div', 'q-expr ltr');
    demoBox.append(p, v, x);
    const dq = L.demo();
    dq.levelId = levelId;
    renderQuestionInto(dq, p, v, x, true);

    $('overlay-explain').classList.remove('hidden');
    setTimeout(() => Speech.speak(explainSpeechText(levelId)), 350);
  }

  function replayExplain() {
    const S = App.state;
    const levelId = explainCtx === 'help' && q ? q.levelId : S.maxLevel;
    Speech.speak(explainSpeechText(levelId));
  }

  function closeExplain() {
    $('overlay-explain').classList.add('hidden');
    Speech.stop();
    const S = App.state;
    if (explainCtx === 'intro') {
      S.explainedUpTo = Math.max(S.explainedUpTo, S.maxLevel);
      App.save();
      freshLeft = 2; // התרגילים הראשונים - מהרמה שהוסברה עכשיו
      nextQuestion();
    } else if (q) {
      // חזרה מתפריט עזרה - מקריאים שוב את השאלה
      Speech.speak(q.speech);
    }
    explainCtx = null;
  }

  function mascotHappy() {
    const m = $('mascot');
    m.classList.remove('happy');
    void m.offsetWidth;
    m.classList.add('happy');
  }

  /* ─── ספירת חפצים בלחיצה ─── */

  function setupCounting() {
    $('q-visual').addEventListener('pointerdown', ev => {
      const o = ev.target.closest('.obj');
      if (!o || o.classList.contains('flyaway') || o.classList.contains('ghost')) return;
      if (o.classList.contains('counted')) {
        o.style.transform = 'scale(1.25)';
        setTimeout(() => o.style.transform = '', 150);
        return;
      }
      countN++;
      o.classList.add('counted');
      o.dataset.n = String(countN);
      Sounds.count(countN);
      Speech.speak(String(countN), { rate: 1.1 });
    });
  }

  /* ─── API ─── */

  return {
    open() {
      const S = App.state;
      updateTopbar();
      if (S.explainedUpTo < S.maxLevel) {
        showExplain(S.maxLevel, 'intro');
      } else {
        nextQuestion();
      }
    },

    stop() {
      clearTimeout(lockTimer);
      clearTimeout(nextTimer);
      clearTimeout(flyTimer);
      Speech.stop();
    },

    sayQuestion() {
      if (q) Speech.speak(q.speech);
    },

    showHelp() {
      if (q) showExplain(q.levelId, 'help');
    },

    replayExplain,
    closeExplain,

    /* אחרי שינוי רמה ידני של הורה */
    applyLevelChange() {
      const S = App.state;
      S.stars = 0;
      S.explainedUpTo = S.maxLevel;
      freshLeft = 0;
      App.save();
      if (!$('screen-game').classList.contains('hidden')) {
        updateTopbar();
        nextQuestion();
      }
    },

    init() { setupCounting(); },
    current() { return q; },
    STARS_PER_LEVEL
  };
})();
