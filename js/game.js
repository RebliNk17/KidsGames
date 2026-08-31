/* ═══════════════ משחק החשבון - רנדור וחיבור למנוע המשותף ═══════════════ */

const MathGame = (() => {
  const LEVELS = Levels.LEVELS;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  /* ─── ויזואליים ─── */

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

  function renderQuestion(qq, { promptEl, visualEl, exprEl }, reveal = false) {
    promptEl.textContent = qq.prompt || '';
    renderVisual(visualEl, qq);
    renderExpr(exprEl, qq, reveal);
    if (qq.kind === 'seq' && reveal) {
      const miss = visualEl.querySelector('.seq-box.missing');
      if (miss) { miss.textContent = String(qq.answer); miss.classList.add('revealed'); }
    }
  }

  /* חשיפת התשובה בלי לרנדר מחדש את הוויזואל (שלא יעופו שוב בלונים) */
  function revealAnswer(qq, { visualEl, exprEl }) {
    renderExpr(exprEl, qq, true);
    if (qq.kind === 'seq') {
      const miss = visualEl.querySelector('.seq-box.missing');
      if (miss) { miss.textContent = String(qq.answer); miss.classList.add('revealed'); }
    }
  }

  /* ─── ספירת חפצים בלחיצה (ייחודי לחשבון) ─── */
  let countN = 0;

  function setupCounting() {
    document.getElementById('q-visual').addEventListener('pointerdown', ev => {
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
    // מונה חדש לכל שאלה: מתאפס כשהוויזואל מתרנדר מחדש
    new MutationObserver(() => { countN = 0; })
      .observe(document.getElementById('q-visual'), { childList: true });
  }

  /* ─── חיבור למנוע ─── */

  const engine = createEngine({
    key: 'math',
    levels: LEVELS,
    renderQuestion,
    revealAnswer,
    optionClass: qq => (qq.kind === 'compare' ? 'compare-card' : ''),
    optionColumns: qq => (qq.options.length === 3 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)'),
    optionContent: (qq, val) => {
      if (qq.kind === 'compare') {
        const wrap = el('span');
        wrap.appendChild(el('span', 'cmp-num', String(val)));
        const dots = el('span', 'cmp-dots');
        for (let i = 0; i < val; i++) dots.appendChild(el('span', 'cmp-dot'));
        wrap.appendChild(dots);
        return wrap;
      }
      return String(val);
    },
    defaultRevealSpeech: qq => `התשובה הנכונה היא ${qq.answer}. לחץ עליה ונמשיך!`,
    champSpeech: 'סיימת את כל הרמות בחשבון! אתה אלוף חשבון אמיתי! ממשיכים להתאמן כמו גדולים.'
  });

  engine.init = setupCounting;
  return engine;
})();

/* שם ישן לתאימות (בדיקות אוטומטיות) */
const Game = MathGame;
