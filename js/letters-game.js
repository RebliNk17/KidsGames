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
    const row = el('div', 'word-big nikud');
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
        visualEl.appendChild(el('div', 'vis-glyph pop-in nikud', v.text));
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
      const slots = el('div', 'build-slots nikud');
      slots.id = 'build-slots';
      q.build.units.forEach((u, i) => {
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
    let k = 0; // כמה יחידות כבר הונחו
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
      const t = el('button', 'tile nikud', unit);
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
            Speech.speak(q.word.p + '!');
            setTimeout(() => api.done(exprEl.querySelector('#build-slots')), 250);
          }
        } else {
          const attempts = api.miss(t, { lockMs: 2000 });
          if (attempts >= 3) highlightNext();
        }
      });
      optionsEl.appendChild(t);
    });
  }

  /* ─── דוגמאות אינטראקטיביות בחלון ההסבר ─── */

  function demoCard(content, sub, onTap) {
    const c = el('button', 'demo-card');
    c.appendChild(el('span', 'demo-main nikud', content));
    if (sub) c.appendChild(el('span', 'demo-sub', sub));
    c.addEventListener('click', () => {
      Sounds.click();
      c.classList.add('wobble');
      setTimeout(() => c.classList.remove('wobble'), 400);
      if (onTap) onTap();
    });
    return c;
  }

  const SOUND_LABEL = { a: 'אַה!', i: 'אִי!', o: 'אוֹ!', e: 'אֶה!', u: 'אוּ!' };

  function renderDemoSpec(spec, box) {
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
            Speech.speak('אותה אות - צורה רגילה וצורה של סוף מילה!');
          }
        });
        row.appendChild(card);
      });
    }

    if (spec.type === 'wordSound' || spec.type === 'wordReveal' || spec.type === 'claps') {
      const W = LL.WORDS.find(x => x.w === spec.word) || { u: LL.splitUnits(spec.word), p: spec.word, e: '⭐', syl: 2 };
      const wrap = el('div', 'word-wrap');
      const hlIdx = spec.highlight === 'first' ? 0 : spec.highlight === 'last' ? W.u.length - 1 : -1;
      wrap.appendChild(wordCardEl(W.u, { hlIdx }));
      wrap.appendChild(el('div', 'word-side-emoji', W.e));
      const btn = el('button', 'demo-card wide');
      btn.appendChild(wrap);
      if (spec.type === 'claps') btn.appendChild(el('div', 'demo-sub', '👏'.repeat(W.syl || 2)));
      btn.addEventListener('click', () => {
        Sounds.click();
        Speech.speak(W.p, { rate: spec.type === 'claps' ? 0.6 : 0.8 });
      });
      row.appendChild(btn);
    }

    if (spec.type === 'vowelCards') {
      spec.items.forEach(item => {
        const L = LL.SYL_LETTERS.find(x => x.glyph === item.L) || LL.SYL_LETTERS[0];
        const v = LL.VOWELS[item.v];
        const glyph = LL.syllGlyph(L, v);
        const label = spec.sayName ? v.name : (SOUND_LABEL[v.sound] || v.name);
        row.appendChild(demoCard(glyph, label, () => {
          if (spec.sayName) Speech.speak(`${v.name}. ${v.shape}.`);
          else Speech.speak(LL.syllSpeech(L, v) + '. ' + LL.syllSpeech(L, v) + '!');
        }));
      });
    }

    if (spec.type === 'missingDemo') {
      const W = LL.WORDS.find(x => x.w === spec.word);
      const wrap = el('div', 'word-wrap');
      wrap.appendChild(wordCardEl(W.u, { blankIdx: spec.idx, revealBlank: true }));
      wrap.appendChild(el('div', 'word-side-emoji', W.e));
      const btn = el('button', 'demo-card wide');
      btn.appendChild(wrap);
      btn.addEventListener('click', () => { Sounds.click(); Speech.speak(W.p); });
      row.appendChild(btn);
    }

    if (spec.type === 'buildDemo') {
      const W = LL.WORDS.find(x => x.w === spec.word);
      const btn = el('button', 'demo-card wide');
      btn.appendChild(el('div', 'word-side-emoji', W.e));
      const slots = el('div', 'build-slots nikud');
      W.u.forEach(u => slots.appendChild(el('span', 'slot filled', u)));
      btn.appendChild(slots);
      btn.addEventListener('click', () => { Sounds.click(); Speech.speak(W.p); });
      row.appendChild(btn);
    }
  }

  LL.LEVELS.forEach(L => {
    L.demoRender = box => renderDemoSpec(L.demoSpec, box);
  });

  /* ─── חיבור למנוע ─── */

  const OPT_CLASS = { letter: 'letter-opt nikud', emoji: 'emoji-opt', word: 'word-opt nikud', num: '' };

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
    champSpeech: 'סיימת את כל רמות האותיות! אתה יודע לקרוא ולבנות מילים! אלוף אמיתי! ממשיכים להתאמן.'
  });

  return engine;
})();
