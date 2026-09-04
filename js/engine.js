/* ═══════════════ מנוע המשחקים המשותף ═══════════════
 * כל משחק (חשבון, אותיות...) הוא קונפיגורציה של המנוע הזה.
 * המנוע מנהל: חלון רמות מתגלגל, כוכבים ועליית רמה, נעילת "זמן חשיבה",
 * סולם רמזים אחרי טעויות, חלון הסבר קולי, מניעת חזרה על אותו תרגיל,
 * מבחן אחרי כל כמה רמות (אופציונלי), ושמירת התקדמות.
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
 *   testEvery      מבחן אחרי כל כמה רמות (0/חסר = בלי מבחנים)
 *   testLength     כמה שאלות במבחן (ברירת מחדל 10)
 *   testPass       כמה תשובות נכונות בניסיון ראשון כדי לעבור (ברירת מחדל 7)
 *   testIntro      (lo, hi, len, pass) - הטקסט המוקרא בפתיחת מבחן
 *   testResult     ({score, total, passed}) - הטקסט המוקרא בסיום מבחן
 * }
 *
 * מניעת חזרות: לכל תרגיל יש מפתח (q.key, ואם אין - טקסט ההקראה). המנוע זוכר
 * את המפתחות של התרגילים האחרונים ומבקש מהמחולל תרגיל אחר אם יצא אחד מהם.
 *
 * מבחן: כשמסיימים רמה שמספרה מתחלק ב-testEvery, במקום לעלות רמה מיד יש מבחן
 * קצר על הרמות של הבלוק (למשל 1-5). בכל שאלה ניסיון אחד בלבד. עוברים - מדליה
 * ועולים רמה; לא עוברים - הכוכבים מתאפסים, מתאמנים עוד קצת, ומנסים שוב.
 * הדגל pendingTest נשמר, כך שיציאה באמצע לא מוותרת על המבחן.
 *
 * מבחן חוזר (retro): מדליה שלא נאספה - למשל של ילד שכבר עבר את הרמות האלה
 * לפני שהמבחנים היו קיימים - נשארת פתוחה לאיסוף. לוחצים עליה באלבום ונכנסים
 * לאותו מבחן בדיוק. הוא לא מעלה רמה ולא מאפס כוכבים: רק אוסף את המדליה.
 */

function createEngine(config) {
  const LEVELS = config.levels;

  /* ─── כוונון ─── */
  const STARS_PER_LEVEL = config.starsPerLevel || 7;
  const WINDOW_SIZE = config.windowSize || 5;
  const THINK_MS = config.thinkMs || 3000;
  const RETRY_MS = config.retryMs || 4000;
  const RECENT_MAX = config.recentMax || 8;      // כמה תרגילים אחרונים לא חוזרים
  const GEN_TRIES = 12;                            // כמה פעמים לנסות תרגיל שלא הופיע לאחרונה
  const TEST_EVERY = config.testEvery || 0;
  const TEST_LEN = config.testLength || 10;
  const TEST_PASS = config.testPass || 7;
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
  let recent = [];          // מפתחות התרגילים האחרונים
  let test = null;          // {levels, blockEnd, retro, queue, idx, score, results} בזמן מבחן
  let pendingIntro = null;  // {blockEnd, retro} - איזה מבחן ייפתח כשסוגרים את חלון הפתיחה
  let introText = '';       // טקסט פתיחת המבחן, נשמר כדי שהקראה מושהית לא תיפול אם כבר התחלנו
  let lastResult = null;    // תוצאת המבחן האחרון (לחלון התוצאה)
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

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
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

  /* ─── מניעת חזרה על אותו תרגיל ─── */
  const keyOf = qq => qq.key || qq.speech || '';

  function genFresh(lvl, seen) {
    let cand = null;
    for (let i = 0; i < GEN_TRIES; i++) {
      cand = LEVELS[lvl - 1].gen();
      if (!seen.includes(keyOf(cand))) break;
    }
    return cand;
  }

  function remember(qq) {
    recent.push(keyOf(qq));
    if (recent.length > RECENT_MAX) recent.shift();
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
    if (firstTry) st.firstTry++;

    /* במבחן: נקודה רק על תשובה נכונה בניסיון ראשון, ובלי כוכבים */
    if (test) {
      if (firstTry) {
        test.score++;
        markTestSlot(test.idx, true);
        if (Math.random() < 0.5) Speech.speak(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
      }
      App.save();
      nextTimer = setTimeout(() => { test.idx++; nextQuestion(); }, 1700);
      return;
    }

    if (firstTry) {
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

    /* במבחן יש ניסיון אחד: מסמנים טעות וחושפים את התשובה */
    if (test) {
      markTestSlot(test.idx, false);
      revealAnswerBtn();
      return;
    }

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
    isTest: () => !!test,
    lockedFeedback,
    miss(elm, { lockMs = 2000 } = {}) {
      attempts++;
      Sounds.wrong();
      if (elm) {
        elm.classList.add('bad');
        setTimeout(() => elm.classList.remove('bad'), 550);
      }
      if (test) {
        // במבחן: הטעות נרשמת, והמפעיל מדגיש את הצעד הבא כדי שיסיים את המילה
        markTestSlot(test.idx, false);
        Speech.speak('לא נורא! האות הבאה מהבהבת - תמשיך לבנות.');
        lock(900);
        return attempts;
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

    if (test) {
      if (test.idx >= test.queue.length) { finishTest(); return; }
      q = test.queue[test.idx];
    } else {
      let lvl;
      if (freshLeft > 0) { lvl = S().maxLevel; freshLeft--; }
      else lvl = pickLevel();
      q = genFresh(lvl, recent);
      q.levelId = lvl;
    }
    remember(q);

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
    const meter = $('star-meter');
    meter.innerHTML = '';
    $('screen-game').classList.toggle('test-mode', !!test);

    if (test) {
      $('level-badge').textContent = '🏅 מבחן';
      test.queue.forEach((_, i) => {
        const r = test.results[i];
        meter.appendChild(el('span', 'test-slot' + (r === undefined ? '' : ' done'),
          r === undefined ? '⚪' : (r ? '✅' : '❌')));
      });
      return;
    }

    const L = LEVELS[st.maxLevel - 1];
    $('level-badge').textContent = `רמה ${st.maxLevel} ${L.icon}`;
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

    /* סוף בלוק של רמות? קודם מבחן, ורק אחרי שעוברים אותו עולים רמה */
    if (TEST_EVERY && st.maxLevel % TEST_EVERY === 0) {
      st.pendingTest = true;
      App.save();
      nextTimer = setTimeout(() => showTestIntro(st.maxLevel), 900);
      return;
    }
    advanceLevel();
  }

  function advanceLevel() {
    const st = S();
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

  /* ─── מבחן ─── */
  /* הרמות שהמבחן שסוגר את blockEnd בודק (למשל 5 ← [1,2,3,4,5]) */
  function testBlock(blockEnd) {
    const lo = Math.max(1, blockEnd - TEST_EVERY + 1);
    const ids = [];
    for (let l = lo; l <= blockEnd; l++) ids.push(l);
    return ids;
  }

  /* שאלות המבחן: מספר שווה מכל רמה בבלוק, בערבוב, בלי חזרות */
  function buildTestQueue(ids) {
    const queue = [];
    const seen = [];
    let order = [];
    while (queue.length < TEST_LEN) {
      if (!order.length) order = shuffle(ids);
      const lvl = order.pop();
      const cand = genFresh(lvl, seen);
      seen.push(keyOf(cand));
      cand.levelId = lvl;
      queue.push(cand);
    }
    return queue;
  }

  function testIntroSpeech() {
    const { blockEnd, retro } = pendingIntro;
    const ids = testBlock(blockEnd);
    return (retro ? 'המדליה הזאת עוד מחכה לך! ' : '') +
      config.testIntro(ids[0], ids[ids.length - 1], TEST_LEN, TEST_PASS);
  }

  function showTestIntro(blockEnd, retro = false) {
    explainCtx = 'test-intro';
    pendingIntro = { blockEnd, retro };
    const ids = testBlock(blockEnd);
    const banner = $('explain-banner');
    banner.textContent = retro ? '🏅 מבחן למדליה! 🏅' : '🏅 מבחן! 🏅';
    banner.classList.remove('hidden');
    $('explain-icon').textContent = '📝';
    $('explain-name').textContent = `מבחן על רמות ${ids[0]} עד ${ids[ids.length - 1]}`;
    introText = testIntroSpeech();
    $('explain-text').textContent = introText;

    // הרמות שבמבחן - כרטיסים לחיצים שמזכירים מה למדנו
    const demoBox = $('explain-demo');
    demoBox.innerHTML = '';
    const row = el('div', 'demo-cards');
    ids.forEach(id => {
      const L = LEVELS[id - 1];
      const c = el('button', 'demo-card');
      c.appendChild(el('span', 'demo-main', L.icon));
      c.appendChild(el('span', 'demo-sub', L.name));
      c.addEventListener('click', () => { Sounds.click(); Speech.speak(`רמה ${id}: ${L.name}`); });
      row.appendChild(c);
    });
    demoBox.appendChild(row);

    $('btn-explain-start').textContent = '▶ מתחילים!';
    // מבחן חוזר נבחר מרצון מהאלבום - חייבת להיות דרך לצאת בלי לעשות אותו
    $('btn-explain-cancel').classList.toggle('hidden', !retro);
    $('overlay-explain').classList.remove('hidden');
    setTimeout(() => Speech.speak(introText), 350);
  }

  function beginTest() {
    const { blockEnd, retro } = pendingIntro;
    const ids = testBlock(blockEnd);
    test = { levels: ids, blockEnd, retro, queue: buildTestQueue(ids), idx: 0, score: 0, results: [] };
    pendingIntro = null;
    recent = [];
    updateTopbar();
    nextQuestion();
  }

  /* התוצאה הראשונה של כל שאלה קובעת (טעות ואז לחיצה על התשובה החשופה = טעות) */
  function markTestSlot(i, ok) {
    if (!test) return;
    if (test.results[i] === undefined) test.results[i] = ok;
    const slot = $('star-meter').children[i];
    if (slot) {
      slot.textContent = test.results[i] ? '✅' : '❌';
      slot.classList.add('done');
    }
  }

  function finishTest() {
    const st = S();
    const total = test.queue.length;
    const passed = test.score >= TEST_PASS;
    const retro = test.retro;
    lastResult = { score: test.score, total, passed, retro, levels: test.levels, results: test.results.slice() };
    const blockEnd = test.blockEnd;
    test = null;
    if (!retro) st.pendingTest = false;
    st.medals = st.medals || [];
    if (passed) {
      if (!st.medals.includes(blockEnd)) st.medals.push(blockEnd);
      Sounds.levelup();
      Confetti.rain();
      mascotHappy();
    } else if (!retro) {
      // כישלון במבחן ההתקדמות מחזיר לתרגול; מבחן חוזר לא עולה כלום
      st.stars = 0;
    }
    App.save();
    App.refreshHome();
    updateTopbar();
    nextTimer = setTimeout(() => showTestResult(lastResult), 500);
  }

  function showTestResult(res) {
    explainCtx = 'test-result';
    const banner = $('explain-banner');
    banner.textContent = res.passed ? '🏅 קיבלת מדליה! 🏅' : '💪 עוד קצת אימון';
    banner.classList.remove('hidden');
    $('explain-icon').textContent = res.passed ? '🏆' : '🤗';
    $('explain-name').textContent = `${res.score} מתוך ${res.total} נכון!`;
    const text = config.testResult(res);
    $('explain-text').textContent = text;

    const demoBox = $('explain-demo');
    demoBox.innerHTML = '';
    const row = el('div', 'test-summary');
    for (let i = 0; i < res.total; i++) row.appendChild(el('span', 'test-slot done', res.results[i] ? '✅' : '❌'));
    demoBox.appendChild(row);

    $('btn-explain-start').textContent = res.passed ? '▶ ממשיכים!' : '▶ מתאמנים עוד!';
    $('btn-explain-cancel').classList.add('hidden');
    $('overlay-explain').classList.remove('hidden');
    setTimeout(() => Speech.speak(text), 350);
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
    const banner = $('explain-banner');
    banner.textContent = '🎉 רמה חדשה! 🎉';
    banner.classList.toggle('hidden', !(ctx === 'intro' && levelId > 1));
    $('explain-icon').textContent = L.icon;
    $('explain-name').textContent = `רמה ${levelId}: ${L.name}`;
    $('explain-text').textContent = L.explain;
    $('btn-explain-start').textContent = ctx === 'help' ? '▶ ממשיכים!' : '▶ מתחילים!';
    $('btn-explain-cancel').classList.add('hidden');

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
    if (explainCtx === 'test-intro') { Speech.speak(introText); return; }
    if (explainCtx === 'test-result' && lastResult) { Speech.speak(config.testResult(lastResult)); return; }
    const levelId = explainCtx === 'help' && q ? q.levelId : S().maxLevel;
    Speech.speak(explainSpeechText(levelId));
  }

  function closeExplain() {
    $('overlay-explain').classList.add('hidden');
    Speech.stop();
    const ctx = explainCtx;
    explainCtx = null;
    if (ctx === 'intro') {
      const st = S();
      st.explainedUpTo = Math.max(st.explainedUpTo, st.maxLevel);
      App.save();
      freshLeft = 2;
      nextQuestion();
    } else if (ctx === 'test-intro') {
      beginTest();
    } else if (ctx === 'test-result') {
      // רק מבחן ההתקדמות מעלה רמה. אחרי מבחן חוזר חוזרים לתרגול הרגיל
      if (lastResult && lastResult.passed && !lastResult.retro) advanceLevel();
      else { updateTopbar(); nextQuestion(); }
    } else if (q) {
      Speech.speak(q.speech);
    }
  }

  /* ─── API ─── */
  return {
    /* opts.testFor - להיכנס ישר למבחן חוזר של הבלוק שנסגר ברמה הזאת */
    open(opts = {}) {
      test = null;
      updateTopbar();
      const st = S();
      if (TEST_EVERY && opts.testFor) showTestIntro(opts.testFor, true);
      else if (TEST_EVERY && st.pendingTest) showTestIntro(st.maxLevel);
      else if (st.explainedUpTo < st.maxLevel) showExplain(st.maxLevel, 'intro');
      else nextQuestion();
    },

    /* האם אפשר לגשת עכשיו למבחן החוזר של הבלוק הזה (עברנו את הרמות, אין מדליה) */
    testAvailable(blockEnd) {
      const st = S();
      return !!TEST_EVERY && blockEnd % TEST_EVERY === 0 &&
        st.maxLevel > blockEnd && !(st.medals || []).includes(blockEnd);
    },

    stop() {
      clearTimeout(lockTimer);
      clearTimeout(nextTimer);
      clearTimeout(flyTimer);
      Speech.stop();
      test = null; // יציאה באמצע מבחן: המבחן יתחיל מחדש בכניסה הבאה (pendingTest נשמר)
      pendingIntro = null;
      $('screen-game').classList.remove('test-mode');
    },

    sayQuestion() {
      if (q) Speech.speak(q.speech, { rate: q.replayRate || 0.92 });
    },

    showHelp() {
      if (q) showExplain(q.levelId, 'help');
    },

    replayExplain,
    closeExplain,

    /* "לא עכשיו" בחלון של מבחן חוזר - סוגרים וחוזרים הביתה */
    cancelExplain() {
      $('overlay-explain').classList.add('hidden');
      $('btn-explain-cancel').classList.add('hidden');
      Speech.stop();
      explainCtx = null;
      pendingIntro = null;
      App.goHome();
    },

    applyLevelChange() {
      const st = S();
      st.stars = 0;
      st.explainedUpTo = st.maxLevel;
      st.pendingTest = false;
      test = null;
      pendingIntro = null;
      recent = [];
      freshLeft = 0;
      App.save();
      if (!$('screen-game').classList.contains('hidden') && App.activeEngine === this) {
        updateTopbar();
        nextQuestion();
      }
    },

    current() { return q; },
    key: config.key,
    STARS_PER_LEVEL,
    TEST_EVERY
  };
}
