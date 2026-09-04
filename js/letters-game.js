/* ═══════════════ משחק האותיות - רנדור, בניית מילים וחיבור למנוע ═══════════════ */

const LettersGame = (() => {
  const LL = LettersLevels;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  /* ─── ויזואליים ─── */

  function wordCardEl(units, { blankIdx = -1, revealBlank = false, hlIdx = -1 } = {}) {
    const row = el('div', 'word-big');
    units.forEach((u, i) => {
      let cls = 'unit';
      if (i === blankIdx) cls += revealBlank ? ' unit-revealed' : ' unit-blank';
      if (i === hlIdx) cls += ' unit-hl';
      row.appendChild(el('span', cls, i === blankIdx && !revealBlank ? '' : u));
    });
    return row;
  }

  function renderQuestion(q, { promptEl, visualEl, exprEl }, reveal = false) {
    promptEl.textContent = q.prompt || '';
    visualEl.innerHTML = '';
    exprEl.innerHTML = '';

    const v = q.visual;
    if (v) {
      if (v.type === 'emoji') {
        visualEl.appendChild(el('div', 'vis-emoji pop-in', v.e));
      }
      if (v.type === 'bigGlyph') {
        visualEl.appendChild(el('div', 'vis-glyph pop-in', v.text));
      }
      if (v.type === 'wordCard') {
        const wrap = el('div', 'word-wrap');
        wrap.appendChild(wordCardEl(v.units, {
          blankIdx: v.blankIdx !== undefined ? v.blankIdx : -1,
          revealBlank: reveal
        }));
        if (v.emoji) wrap.appendChild(el('div', 'word-side-emoji', v.emoji));
        visualEl.appendChild(wrap);
      }
    }

    if (q.kind === 'build') {
      const slots = el('div', 'build-slots');
      slots.id = 'build-slots';
      q.build.units.forEach(u => {
        slots.appendChild(el('span', 'slot' + (reveal ? ' filled' : ''), reveal ? u : ''));
      });
      exprEl.appendChild(slots);
    }
  }

  /* חשיפה עדינה כשנענתה נכון */
  function revealAnswer(q, { visualEl, exprEl }) {
    if (q.visual && q.visual.type === 'wordCard' && q.visual.blankIdx !== undefined) {
      const blank = visualEl.querySelector('.unit-blank');
      if (blank) {
        blank.textContent = q.visual.units[q.visual.blankIdx];
        blank.classList.remove('unit-blank');
        blank.classList.add('unit-revealed');
      }
    }
    if (q.kind === 'build') {
      exprEl.querySelectorAll('.slot').forEach((s, i) => {
        if (!s.classList.contains('filled')) {
          s.textContent = q.build.units[i];
          s.classList.add('filled');
        }
      });
    }
  }

  /* ─── אינטראקציית בניית מילה ─── */

  function renderBuild(q, { optionsEl, exprEl }, api) {
    let k = 0; // כמה אותיות כבר הונחו
    let guideOn = false;
    const units = q.build.units;

    optionsEl.innerHTML = '';
    optionsEl.style.gridTemplateColumns = `repeat(${q.build.tiles.length}, 1fr)`;

    const slots = () => exprEl.querySelectorAll('.slot');

    const highlightNext = () => {
      guideOn = true;
      [...optionsEl.children].forEach(t => {
        t.classList.toggle('guide', !t.classList.contains('used') && t.dataset.unit === units[k]);
      });
    };

    q.build.tiles.forEach(unit => {
      const t = el('button', 'tile', unit);
      t.dataset.unit = unit;
      t.addEventListener('click', () => {
        if (t.classList.contains('used')) return;
        if (api.isLocked()) { api.lockedFeedback(t); return; }

        if (unit === units[k]) {
          t.classList.add('used');
          t.classList.remove('guide');
          const s = slots()[k];
          s.textContent = unit;
          s.classList.add('filled');
          api.stepSound(k + 1);
          k++;
          if (guideOn) highlightNext();
          if (k === units.length) {
            Speech.speak(q.word.w + '!');
            setTimeout(() => api.done(exprEl.querySelector('#build-slots')), 250);
          }
        } else {
          const attempts = api.miss(t, { lockMs: 2000 });
          // אחרי שלוש טעויות (ובמבחן - מיד) מדגישים את האות הבאה
          if (attempts >= 3 || api.isTest()) highlightNext();
        }
      });
      optionsEl.appendChild(t);
    });
  }

  /* ─── דוגמאות אינטראקטיביות בחלון ההסבר ─── */

  function demoCard(content, sub, onTap) {
    const c = el('button', 'demo-card');
    c.appendChild(el('span', 'demo-main', content));
    if (sub) c.appendChild(el('span', 'demo-sub', sub));
    c.addEventListener('click', () => {
      Sounds.click();
      c.classList.add('wobble');
      setTimeout(() => c.classList.remove('wobble'), 400);
      if (onTap) onTap();
    });
    return c;
  }

  /* כרטיס מילה רחב: המילה הכתובה + התמונה. לחיצה מקריאה את המילה (או טקסט אחר) */
  function wordDemoCard(W, { hlIdx = -1, blankIdx = -1, rate = 0.8, extra = null, say = null } = {}) {
    const wrap = el('div', 'word-wrap');
    wrap.appendChild(wordCardEl(W.u, { hlIdx, blankIdx, revealBlank: blankIdx >= 0 }));
    wrap.appendChild(el('div', 'word-side-emoji', W.e));
    const btn = el('button', 'demo-card wide');
    btn.appendChild(wrap);
    if (extra) btn.appendChild(extra);
    btn.addEventListener('click', () => {
      Sounds.click();
      Speech.speak(say || W.w, { rate });
    });
    return btn;
  }

  function renderDemoSpec(spec, box) {
    if (Array.isArray(spec)) { spec.forEach(s => renderDemoSpec(s, box)); return; }

    const row = el('div', 'demo-cards');
    box.appendChild(row);

    if (spec.type === 'letterCards') {
      spec.chars.forEach(ch => {
        const L = LL.byChar[ch];
        const kw = L.kws[0];
        row.appendChild(demoCard(ch, kw.e + ' ' + kw.w,
          () => Speech.speak(`${L.sname}. כמו ${kw.w}!`)));
      });
    }

    if (spec.type === 'pairCards') {
      spec.pairs.forEach(([a, b]) => {
        const card = demoCard(`${a} ${b}`, null, () => {
          if (spec.speakKeywords) {
            const ka = LL.byChar[a], kb = LL.byChar[b];
            Speech.speak(`${ka.kws[0].w} מתחיל בזאת, ${kb.kws[0].w} מתחיל בזאת. הן דומות אבל שונות!`);
          } else {
            Speech.speak(`${LL.letterName(a)}. אותה אות - צורה רגילה וצורה של סוף מילה!`);
          }
        });
        row.appendChild(card);
      });
    }

    /* מילים עם הדגשת האות הפותחת/הסוגרת */
    if (spec.type === 'wordSound') {
      spec.items.forEach(item => {
        const W = LL.wordOf(item.word);
        const hlIdx = item.highlight === 'first' ? 0 : item.highlight === 'last' ? W.u.length - 1 : -1;
        row.appendChild(wordDemoCard(W, { hlIdx }));
      });
    }

    if (spec.type === 'wordReveal') {
      row.appendChild(wordDemoCard(LL.wordOf(spec.word)));
    }

    /* הברות: התמונה, המילה, ונקודה לכל הברה. לחיצה מקריאה לאט */
    if (spec.type === 'syllables') {
      spec.words.forEach(word => {
        const W = LL.wordOf(word);
        const dots = el('div', 'syl-dots', '●'.repeat(W.syl));
        row.appendChild(wordDemoCard(W, { rate: 0.6, extra: dots }));
      });
    }

    /* אות אחת ומילים שמתחילות/נגמרות בה */
    if (spec.type === 'letterWords') {
      const name = LL.letterName(spec.ch);
      row.appendChild(demoCard(spec.ch, null, () => Speech.speak(name)));
      spec.words.forEach(word => {
        const W = LL.wordOf(word);
        const hlIdx = spec.where === 'first' ? 0 : W.u.length - 1;
        const say = spec.where === 'first'
          ? `${W.w}. המילה ${W.w} מתחילה באות ${name}!`
          : `${W.w}. המילה ${W.w} נגמרת באות ${name}!`;
        row.appendChild(wordDemoCard(W, { hlIdx, say }));
      });
    }

    if (spec.type === 'missingDemo') {
      row.appendChild(wordDemoCard(LL.wordOf(spec.word), { blankIdx: spec.idx }));
    }

    if (spec.type === 'buildDemo') {
      const W = LL.wordOf(spec.word);
      const btn = el('button', 'demo-card wide');
      btn.appendChild(el('div', 'word-side-emoji', W.e));
      const slots = el('div', 'build-slots');
      W.u.forEach(u => slots.appendChild(el('span', 'slot filled', u)));
      btn.appendChild(slots);
      btn.addEventListener('click', () => { Sounds.click(); Speech.speak(W.w); });
      row.appendChild(btn);
    }
  }

  LL.LEVELS.forEach(L => {
    L.demoRender = box => renderDemoSpec(L.demoSpec, box);
  });

  /* ─── חיבור למנוע ─── */

  const OPT_CLASS = { letter: 'letter-opt', emoji: 'emoji-opt', word: 'word-opt', num: '' };

  const engine = createEngine({
    key: 'letters',
    levels: LL.LEVELS,
    renderQuestion,
    revealAnswer,
    build: { render: renderBuild },
    optionClass: q => OPT_CLASS[q.optStyle] || '',
    optionColumns: q => {
      const n = q.options.length;
      if (q.optStyle === 'word') return '1fr';
      if (q.optStyle === 'emoji' && n === 4) return 'repeat(2, 1fr)';
      return `repeat(${n}, 1fr)`;
    },
    optionContent: (q, val) => String(val),
    defaultRevealSpeech: () => 'התשובה הנכונה מהבהבת! לחץ עליה ונמשיך.',
    champSpeech: 'סיימת את כל רמות האותיות! אתה יודע לקרוא ולבנות מילים! אלוף אמיתי! ממשיכים להתאמן.',

    /* מבחן קטן אחרי כל 5 רמות */
    testEvery: 5,
    testLength: 10,
    testPass: 7,
    testIntro: (lo, hi, len, pass) =>
      `הגיע הזמן למבחן קטן! ${len} שאלות על מה שלמדנו ברמות ${lo} עד ${hi}. ` +
      `במבחן יש רק ניסיון אחד לכל שאלה, אז תחשוב טוב לפני שאתה בוחר. ` +
      `מי שעונה נכון על ${pass} שאלות - מקבל מדליה! בהצלחה!`,
    testResult: ({ score, total, passed, retro }) => passed
      ? `כל הכבוד! ענית נכון על ${score} מתוך ${total}! עברת את המבחן וקיבלת מדליה!` +
        (retro ? ' המדליה שלך באלבום! ממשיכים לשחק!' : ' ממשיכים לרמה הבאה!')
      : `ענית נכון על ${score} מתוך ${total}. כמעט! בוא נתאמן עוד קצת, ואז ננסה שוב. אתה תצליח!` +
        (retro ? ' המדליה תמשיך לחכות לך באלבום.' : '')
  });

  return engine;
})();
