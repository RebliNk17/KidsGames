/* ═══════════════ משחק החשיבה - רנדור, אינטראקציות וחיבור למנוע ═══════════════
 * שאלות בחירה (kind: 'pick') - המנוע מצייר את הכפתורים ואנחנו רק את התוכן.
 * שאלות פעולה (kind: 'build') - כאן: זיכרון, מה נעלם, סדר לפי גודל, מה קורה קודם.
 * הכול אמוג'י ו-CSS: צלליות (filter), היפוך (scaleX), כוסות, שולחן וקופסה. */

const ThinkingGame = (() => {
  const TL = ThinkingLevels;
  const $ = id => document.getElementById(id);

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  /* ─── אבני בניין ─── */
  const emojiNode = (e, cls = '') => el('span', cls, e);

  function dotNode(hex, cls = '') {
    const d = el('span', 'dot ' + cls);
    d.style.background = hex;
    return d;
  }

  const patternItemNode = (item, cls = '') => (item.kind === 'dot' ? dotNode(item.hex, cls) : emojiNode(item.e, cls));

  /* כוס מלאה / ריקה (להפכים) */
  const glassNode = kind => el('div', 'glass ' + kind);
  const sideNode = side => (side.e ? emojiNode(side.e) : glassNode(side.css));

  function qtyNode(e, n) {
    const box = el('div', 'qty');
    for (let i = 0; i < n; i++) box.appendChild(el('span', 'qty-e', e));
    return box;
  }

  /* סצנה קטנה: חיה על / מתחת / ליד שולחן, או בתוך / על / ליד קופסה */
  function sceneNode(prop, e, pos) {
    const s = el('div', 'scene scene-' + prop);
    if (prop === 'table') {
      s.appendChild(el('div', 'prop-table'));
    } else {
      s.appendChild(el('div', 'box-back'));
      s.appendChild(el('div', 'box-front'));
    }
    s.appendChild(el('span', 'actor pos-' + pos, e));
    return s;
  }

  /* חפצים לספירה בלחיצה (אותה מחלקה .obj כמו בחשבון - הספירה בלחיצה משותפת) */
  function objRow(emoji, count, cls = 'obj-grid') {
    const grid = el('div', cls);
    grid.style.gridTemplateColumns = `repeat(${Math.min(count, 5)}, auto)`;
    for (let i = 0; i < count; i++) {
      const o = el('span', 'obj', emoji);
      o.style.animationDelay = (i * 70) + 'ms';
      grid.appendChild(o);
    }
    return grid;
  }

  /* טיימר שמתבטל אם השאלה התחלפה או שיצאו מהמשחק */
  function later(q, ms, fn) {
    setTimeout(() => {
      if (engine.current() !== q) return;
      if ($('screen-game').classList.contains('hidden')) return;
      fn();
    }, ms);
  }

  /* ─── ויזואל השאלה ─── */
  function renderQuestion(q, { promptEl, visualEl, exprEl }, reveal = false) {
    promptEl.textContent = q.prompt || '';
    visualEl.innerHTML = '';
    exprEl.innerHTML = '';
    const v = q.visual;
    if (!v) return;

    if (v.type === 'listen') visualEl.appendChild(el('div', 'vis-listen', v.e));
    if (v.type === 'emoji') visualEl.appendChild(el('div', 'vis-emoji pop-in', v.e));
    if (v.type === 'css') {
      const w = el('div', 'vis-css pop-in');
      w.appendChild(glassNode(v.css));
      visualEl.appendChild(w);
    }

    if (v.type === 'shadow') {
      const w = el('div', 'vis-shadow pop-in');
      w.appendChild(el('span', 'silhouette' + (reveal ? ' unmasked' : ''), v.e));
      visualEl.appendChild(w);
    }

    if (v.type === 'pattern') {
      const row = el('div', 'pattern-row' + (v.seq.length > 6 ? ' long' : ''));
      v.seq.forEach((item, i) => {
        const cell = el('div', 'pattern-item' + (item ? '' : ' missing'));
        cell.style.animationDelay = (i * 80) + 'ms';
        if (item) cell.appendChild(patternItemNode(item));
        else if (reveal) { cell.classList.add('revealed'); cell.appendChild(patternItemNode(q.pattern.full[v.missIdx])); }
        else cell.textContent = '?';
        row.appendChild(cell);
      });
      visualEl.appendChild(row);
    }

    if (v.type === 'numArrow') {
      const row = el('div', 'seq-row');
      const nBox = el('div', 'seq-box', String(v.n));
      const qBox = el('div', 'seq-box missing', reveal ? String(q.answer) : '?');
      if (reveal) qBox.classList.add('revealed');
      const arrow = el('span', 'seq-arrow-ltr', '→');
      if (v.mode === 'after') row.append(nBox, arrow, qBox);
      else row.append(qBox, arrow, nBox);
      visualEl.appendChild(row);
    }

    if (v.type === 'hidden') {
      const scene = el('div', 'hidden-scene');
      const out = objRow(v.emoji, v.total, 'obj-grid hs-out');
      const box = el('div', 'hs-box');
      const inner = el('div', 'hs-inner');
      for (let i = 0; i < v.k; i++) inner.appendChild(el('span', 'hs-e', v.emoji));
      box.appendChild(inner);
      box.appendChild(el('div', 'lid', '?'));
      scene.append(out, box);
      visualEl.appendChild(scene);
      const hide = () => {
        const objs = [...out.querySelectorAll('.obj')];
        objs.slice(v.total - v.k).forEach((o, i) => {
          o.classList.add('ghost');            // לא נספר יותר בלחיצה
          setTimeout(() => o.classList.add('to-box'), i * 120);
        });
        box.classList.add('closed');
      };
      if (reveal) { hide(); box.classList.add('open'); }
      else later(q, 2200, () => { Sounds.whoosh(); hide(); });
    }

    if (v.type === 'share') {
      const scene = el('div', 'share-scene');
      if (reveal) {
        scene.appendChild(pilesNode(v));
      } else {
        const kids = el('div', 'share-kids');
        v.kids.forEach(k => kids.appendChild(el('span', 'share-kid', k)));
        scene.appendChild(kids);
        scene.appendChild(objRow(v.emoji, v.total, 'obj-grid share-items'));
      }
      visualEl.appendChild(scene);
    }
  }

  function pilesNode(v) {
    const piles = el('div', 'share-piles');
    v.kids.forEach(k => {
      const p = el('div', 'pile');
      p.appendChild(el('span', 'share-kid', k));
      const items = el('div', 'pile-items');
      for (let i = 0; i < v.each; i++) items.appendChild(el('span', 'pile-e', v.emoji));
      p.appendChild(items);
      piles.appendChild(p);
    });
    return piles;
  }

  /* חשיפה עדינה כשנענתה נכון */
  function revealAnswer(q, { visualEl }) {
    const v = q.visual;
    if (!v) return;
    if (v.type === 'shadow') {
      const s = visualEl.querySelector('.silhouette');
      if (s) s.classList.add('unmasked');
    }
    if (v.type === 'pattern') {
      const miss = visualEl.querySelector('.pattern-item.missing');
      if (miss) { miss.textContent = ''; miss.appendChild(patternItemNode(q.pattern.full[v.missIdx])); miss.classList.add('revealed'); }
    }
    if (v.type === 'numArrow') {
      const miss = visualEl.querySelector('.seq-box.missing');
      if (miss) { miss.textContent = String(q.answer); miss.classList.add('revealed'); }
    }
    if (v.type === 'hidden') {
      const box = visualEl.querySelector('.hs-box');
      if (box) { box.classList.add('closed'); box.classList.add('open'); }
    }
    if (v.type === 'share') {
      const scene = visualEl.querySelector('.share-scene');
      if (scene) { scene.innerHTML = ''; scene.appendChild(pilesNode(v)); }
    }
  }

  /* ─── תוכן הכפתורים ─── */
  const OPT_CLASS = {
    emoji: 'think-opt emoji-opt', cells: 'think-opt cell-opt', num: 'num-opt', qty: 'qty-opt',
    scene: 'scene-opt', pattern: 'pat-opt', opp: 'think-opt opp-opt'
  };

  function optionColumns(q) {
    const n = q.options.length;
    if (q.optStyle === 'cells') return 'repeat(4, 1fr)';
    if (q.optStyle === 'qty') return 'repeat(2, 1fr)';
    if (q.optStyle === 'emoji' && n === 4) return 'repeat(2, 1fr)';
    return `repeat(${n}, 1fr)`;
  }

  function optionContent(q, val) {
    switch (q.optStyle) {
      case 'cells': {
        const [, e, flip] = String(val).split(':');
        return emojiNode(e, flip === '1' ? 'flip' : '');
      }
      case 'qty': return qtyNode(q.item.e, Number(val));
      case 'scene': return sceneNode(q.scene.prop, q.scene.e, String(val));
      case 'pattern': return patternItemNode(q.items[val]);
      case 'opp': return sideNode(q.sides[val]);
      default: return String(val);
    }
  }

  /* ─── משחק זיכרון ─── */
  function renderMemory(q, { visualEl, optionsEl }, api) {
    const { cards, pairs } = q.memory;
    optionsEl.style.gridTemplateColumns = `repeat(${cards.length <= 6 ? 3 : 4}, 1fr)`;
    visualEl.innerHTML = '';
    const prog = el('div', 'mem-progress');
    for (let i = 0; i < pairs; i++) prog.appendChild(el('span', 'mem-slot', '❓'));
    visualEl.appendChild(prog);

    let open = [], busy = false, found = 0;
    cards.forEach((e, i) => {
      const c = el('button', 'mem-card');
      c.dataset.e = e;
      c.style.animationDelay = (i * 40) + 'ms';
      const face = el('span', 'mem-face', '❓');
      c.appendChild(face);
      c.addEventListener('click', () => {
        if (busy || c.classList.contains('open') || c.classList.contains('matched')) return;
        if (api.isLocked()) { api.lockedFeedback(c); return; }
        Sounds.click();
        c.classList.add('open');
        face.textContent = e;
        const it = TL.itemOf(e);
        if (it) Speech.speak(it.n, { rate: 1 });
        open.push(c);
        if (open.length < 2) return;
        busy = true;
        const [a, b] = open;
        if (a.dataset.e === b.dataset.e) {
          found++;
          setTimeout(() => {
            a.classList.add('matched');
            b.classList.add('matched');
            const slot = prog.children[found - 1];
            slot.textContent = e;
            slot.classList.add('found');
            api.stepSound(found);
            open = [];
            busy = false;
            if (found === pairs) {
              Speech.speak('מצאת את כל הזוגות!');
              setTimeout(() => api.done(prog), 500);
            }
          }, 350);
        } else {
          Sounds.tick();
          setTimeout(() => {
            [a, b].forEach(x => { x.classList.remove('open'); x.querySelector('.mem-face').textContent = '❓'; });
            open = [];
            busy = false;
          }, 1000);
        }
      });
      optionsEl.appendChild(c);
    });
  }

  /* ─── מה נעלם? ─── */
  function renderVanish(q, { visualEl, optionsEl }, api) {
    const { shown, gone, lookMs } = q.vanish;
    visualEl.innerHTML = '';
    const grid = el('div', 'vanish-grid' + (shown.length > 4 ? ' six' : ''));
    const cards = shown.map((e, i) => {
      const c = el('div', 'vn-item pop-in', e);
      c.style.animationDelay = (i * 80) + 'ms';
      grid.appendChild(c);
      return c;
    });
    visualEl.appendChild(grid);
    optionsEl.style.gridTemplateColumns = '1fr';
    optionsEl.appendChild(el('div', 'vn-wait', '👀 תסתכל טוב ותזכור...'));

    later(q, lookMs, () => {
      const card = cards[shown.indexOf(gone)];
      Sounds.whoosh();
      card.classList.add('gone');
      card.textContent = '❓';
      q.speech = q.afterSpeech; // כפתור ההקראה יחזור עכשיו על השאלה, לא על ההוראה להסתכל
      Speech.speak(q.afterSpeech);

      optionsEl.innerHTML = '';
      optionsEl.style.gridTemplateColumns = q.options.length === 4 ? 'repeat(2, 1fr)' : `repeat(${q.options.length}, 1fr)`;
      const reveal = () => {
        [...optionsEl.children].forEach(x => x.classList.add(x.dataset.value === gone ? 'reveal' : 'spent'));
        Speech.speak(q.revealSpeech);
      };
      q.options.forEach(e => {
        const b = el('button', 'opt think-opt emoji-opt', e);
        b.dataset.value = e;
        b.addEventListener('click', () => {
          if (b.classList.contains('spent')) return;
          if (api.isLocked() && !b.classList.contains('reveal')) { api.lockedFeedback(b); return; }
          if (e === gone) {
            Sounds.click();
            b.classList.add('good');
            card.textContent = gone;
            card.classList.remove('gone');
            card.classList.add('back');
            api.done(b);
            return;
          }
          const attempts = api.miss(b, { lockMs: 2000 });
          setTimeout(() => b.classList.add('spent'), 550);
          const remaining = [...optionsEl.children].filter(x => !x.classList.contains('spent') && x !== b).length;
          if (remaining <= 1 || attempts >= 3) reveal();
        });
        optionsEl.appendChild(b);
      });
    });
  }

  /* ─── סידור לפי סדר (גודל / סיפור): לוחצים על האריחים בסדר הנכון ─── */
  function renderOrdered(q, { exprEl, optionsEl }, api, spec) {
    optionsEl.innerHTML = '';
    optionsEl.style.gridTemplateColumns = `repeat(${spec.tiles.length}, 1fr)`;
    exprEl.innerHTML = '';
    const row = el('div', 'seq-slots ' + (spec.cls || ''));
    const slots = spec.expected.map((key, i) => {
      const s = el('span', 'slot seq-slot');
      if (spec.slotClass) s.classList.add(spec.slotClass(key));
      row.appendChild(s);
      if (spec.arrows && i < spec.expected.length - 1) row.appendChild(el('span', 'seq-arrow', '←'));
      return s;
    });
    exprEl.appendChild(row);

    let k = 0, guideOn = false;
    const tiles = spec.tiles.map(t => {
      const b = el('button', 'tile seq-tile');
      b.dataset.key = t.key;
      b.appendChild(t.node);
      optionsEl.appendChild(b);
      return b;
    });
    const highlight = () => {
      guideOn = true;
      tiles.forEach(t => t.classList.toggle('guide', !t.classList.contains('used') && t.dataset.key === spec.expected[k]));
      slots.forEach((s, i) => s.classList.toggle('guide', i === k));
    };
    tiles.forEach(t => t.addEventListener('click', () => {
      if (t.classList.contains('used')) return;
      if (api.isLocked()) { api.lockedFeedback(t); return; }
      if (t.dataset.key !== spec.expected[k]) {
        if (api.miss(t, { lockMs: 2000 }) >= 3) highlight();
        return;
      }
      Sounds.click();
      t.classList.add('used');
      t.classList.remove('guide');
      const s = slots[k];
      s.appendChild(spec.slotFor(t.dataset.key));
      s.classList.add('filled');
      s.classList.remove('guide');
      if (spec.onStep) spec.onStep(t.dataset.key);
      k++;
      api.stepSound(k);
      if (guideOn) highlight();
      if (k === spec.expected.length) {
        spec.onDone();
        setTimeout(() => api.done(row), 300);
      }
    }));
  }

  function renderOrder(q, els, api) {
    const e = q.item.e;
    renderOrdered(q, els, api, {
      cls: 'order-slots',
      tiles: q.order.tiles.map(sz => ({ key: sz, node: emojiNode(e, 'sz-' + sz) })),
      expected: q.order.expected,
      slotClass: sz => 'slot-' + sz,
      slotFor: sz => emojiNode(e, 'sz-' + sz),
      onDone: () => Speech.speak(q.dir === 'asc' ? 'מהקטן לגדול. מסודר!' : 'מהגדול לקטן. מסודר!')
    });
  }

  function renderStory(q, els, api) {
    const byE = {};
    q.story.steps.forEach(s => { byE[s.e] = s; });
    renderOrdered(q, els, api, {
      cls: 'story-slots',
      arrows: true,
      tiles: q.story.tiles.map(s => ({ key: s.e, node: emojiNode(s.e) })),
      expected: q.story.steps.map(s => s.e),
      slotFor: e => emojiNode(e),
      onStep: e => Speech.speak(byE[e].n, { rate: 1 }),
      onDone: () => Speech.speak(q.doneSpeech)
    });
  }

  function renderBuild(q, els, api) {
    if (q.type === 'memory') return renderMemory(q, els, api);
    if (q.type === 'vanish') return renderVanish(q, els, api);
    if (q.type === 'order') return renderOrder(q, els, api);
    if (q.type === 'story') return renderStory(q, els, api);
  }

  /* ─── דוגמאות בחלון ההסבר ─── */
  function card(nodes, sub, say, cls = '') {
    const c = el('button', 'demo-card ' + cls);
    const main = el('span', 'demo-main');
    (Array.isArray(nodes) ? nodes : [nodes]).forEach(n => main.appendChild(typeof n === 'string' ? emojiNode(n) : n));
    c.appendChild(main);
    if (sub) c.appendChild(el('span', 'demo-sub', sub));
    c.addEventListener('click', () => {
      Sounds.click();
      c.classList.add('wobble');
      setTimeout(() => c.classList.remove('wobble'), 400);
      if (say) Speech.speak(typeof say === 'function' ? say() : say);
    });
    return c;
  }

  const nameOf = e => (TL.itemOf(e) || { n: '' }).n;

  function renderDemoSpec(spec, box) {
    const row = el('div', 'demo-cards');
    box.appendChild(row);
    const S = spec;

    if (S.type === 'spotDemo') {
      S.cells.forEach((e, i) => row.appendChild(card(e, i === S.oddIdx ? 'שונה!' : '', S.say, i === S.oddIdx ? 'demo-odd' : '')));
    }
    if (S.type === 'shadowDemo') {
      row.appendChild(card(el('span', 'silhouette', S.e), 'הצל', `זה הצל של ה${S.n}!`));
      row.appendChild(card(S.e, S.n, `${S.n}! הצל שלו שחור, אבל הצורה אותה צורה.`));
    }
    if (S.type === 'memoryDemo') {
      S.items.forEach(e => {
        const c = card([e, e], 'זוג!', `${nameOf(e)} ו${nameOf(e)} - זוג!`);
        row.appendChild(c);
      });
    }
    if (S.type === 'vanishDemo') {
      S.items.forEach((e, i) => {
        const gone = i === S.goneIdx;
        row.appendChild(card(gone ? '❓' : e, gone ? 'נעלם!' : '', gone ? `כאן היה ${nameOf(e)}, והוא נעלם!` : nameOf(e), gone ? 'demo-odd' : ''));
      });
    }
    if (S.type === 'orderDemo') {
      [['s', 'קטן'], ['m', 'בינוני'], ['l', 'גדול']].forEach(([sz, cap]) => {
        row.appendChild(card(emojiNode(S.e, 'sz-' + sz), cap, `${nameOf(S.e)} ${cap}`));
      });
      row.classList.add('align-end');
    }
    if (S.type === 'oddDemo') {
      S.items.forEach((e, i) => row.appendChild(card(e, i === S.oddIdx ? 'לא שייך' : nameOf(e), S.say, i === S.oddIdx ? 'demo-odd' : '')));
    }
    if (S.type === 'pairDemo') {
      S.pairs.forEach(ae => {
        const p = TL.PAIRS.find(x => x.a.e === ae);
        if (p) row.appendChild(card([p.a.e, el('span', 'demo-plus', '+'), p.b.e], `${p.a.n} ו${p.b.n}`, p.why + '!', 'wide'));
      });
    }
    if (S.type === 'oppDemo') {
      S.adjs.forEach(adj => {
        const pair = TL.OPPOSITES.find(p => p.some(s => s.adj === adj));
        if (!pair) return;
        const a = pair.find(s => s.adj === adj), b = pair.find(s => s !== a);
        row.appendChild(card([sideNode(a), el('span', 'demo-plus', '↔'), sideNode(b)], `${a.adj} / ${b.adj}`, `${a.adj}. וההפך: ${b.adj}!`, 'wide'));
      });
    }
    if (S.type === 'patternDemo') {
      const letters = [...new Set(S.unit)];
      const map = {};
      letters.forEach((L, i) => { map[L] = S.items[i]; });
      const seq = [];
      for (let i = 0; i <= S.len; i++) seq.push(map[S.unit[i % S.unit.length]]);
      const prow = el('div', 'pattern-row' + (seq.length > 6 ? ' long' : ''));
      seq.forEach((e, i) => {
        const cell = el('div', 'pattern-item' + (i === S.len ? ' revealed' : ''));
        cell.appendChild(emojiNode(e));
        prow.appendChild(cell);
      });
      const names = seq.map(nameOf);
      row.appendChild(card(prow, 'הסדרה חוזרת על עצמה', names.slice(0, -1).join(', ') + ', ואחר כך: ' + names[names.length - 1] + '!', 'wide'));
    }
    if (S.type === 'riddleDemo') {
      row.appendChild(card('🤔', S.text, `${S.text} ${S.answer}!`, 'wide'));
      row.appendChild(card(S.e, S.answer, `${S.answer}!`));
    }
    if (S.type === 'positionDemo') {
      const prop = TL.PROPS.find(p => p.key === S.prop);
      S.positions.forEach(pos => {
        const phrase = TL.POS_PHRASE[pos](prop.n);
        row.appendChild(card(sceneNode(S.prop, S.e, pos), phrase, `ה${nameOf(S.e)} ${phrase}`, 'demo-scene'));
      });
    }
    if (S.type === 'storyDemo') {
      const steps = TL.STORIES[S.story];
      const srow = el('div', 'seq-slots story-slots');
      steps.forEach((s, i) => {
        const slot = el('span', 'slot seq-slot filled');
        slot.appendChild(emojiNode(s.e));
        srow.appendChild(slot);
        if (i < steps.length - 1) srow.appendChild(el('span', 'seq-arrow', '←'));
      });
      row.appendChild(card(srow, steps.map(s => s.n).join(', ואז '), steps.map(s => s.n).join(', ואז ') + '!', 'wide'));
    }
    if (S.type === 'compareDemo') {
      const [a, b] = S.counts;
      const it = TL.COUNT_ITEMS.find(c => c.e === S.e);
      row.appendChild(card(qtyNode(S.e, a), 'פחות', `כאן יש ${TL.countPhrase(a, it)} - פחות.`));
      row.appendChild(card(qtyNode(S.e, b), 'יותר', `כאן יש ${TL.countPhrase(b, it)} - יותר!`, 'demo-odd'));
    }
    if (S.type === 'numLineDemo') {
      const nrow = el('div', 'seq-row');
      for (let n = S.from; n <= S.to; n++) nrow.appendChild(el('div', 'seq-box' + (n === S.mark ? ' revealed' : ''), String(n)));
      row.appendChild(card(nrow, `לפני ${S.mark} בא ${S.mark - 1}, אחרי ${S.mark} בא ${S.mark + 1}`,
        `המספרים בסדר: ${Array.from({ length: S.to - S.from + 1 }, (_, i) => S.from + i).join(', ')}. לפני ${S.mark} בא ${S.mark - 1}, ואחרי ${S.mark} בא ${S.mark + 1}!`, 'wide'));
    }
    if (S.type === 'hiddenDemo') {
      const it = TL.COUNT_ITEMS.find(c => c.e === S.e);
      const scene = el('div', 'hidden-scene demo');
      scene.appendChild(objRow(S.e, S.total - S.k, 'obj-grid hs-out'));
      const bx = el('div', 'hs-box closed open');
      const inner = el('div', 'hs-inner');
      for (let i = 0; i < S.k; i++) inner.appendChild(el('span', 'hs-e', S.e));
      bx.appendChild(inner);
      bx.appendChild(el('div', 'lid', '?'));
      scene.appendChild(bx);
      row.appendChild(card(scene, `${S.total} בסך הכול: ${S.total - S.k} בחוץ, ${S.k} בקופסה`,
        `היו ${TL.countPhrase(S.total, it)}. ${S.total - S.k} נשארו בחוץ, אז ${S.k} מתחבאים בקופסה!`, 'wide'));
    }
    if (S.type === 'shareDemo') {
      const it = TL.COUNT_ITEMS.find(c => c.e === S.e);
      const v = { emoji: S.e, kids: TL.KIDS.slice(0, S.kids).map(k => k.e), each: S.each };
      row.appendChild(card(pilesNode(v), `${TL.countPhrase(S.kids * S.each, it)} לשני ילדים: ${S.each} לכל אחד`,
        `${TL.countPhrase(S.kids * S.each, it)} לשני ילדים. כל ילד מקבל ${S.each}!`, 'wide'));
    }
    if (S.type === 'champDemo') {
      ['🧠', '🙈', '🎼', '🤔', '📦'].forEach(e => row.appendChild(card(e, '', 'אלוף החשיבה! הכול בערבוב.')));
    }
  }

  TL.LEVELS.forEach(L => { L.demoRender = box => renderDemoSpec(L.demoSpec, box); });

  /* ─── חיבור למנוע ─── */
  const engine = createEngine({
    key: 'thinking',
    levels: TL.LEVELS,
    starsPerLevel: 5,   // רמות קצרות יותר לגיל 3-4
    windowSize: 4,
    thinkMs: 1500,      // נעילת חשיבה קצרה: רק כדי שלא ילחצו לפני שהשאלה נשמעה
    retryMs: 2500,
    recentMax: 6,
    renderQuestion,
    revealAnswer,
    build: { render: renderBuild },
    optionClass: q => OPT_CLASS[q.optStyle] || '',
    optionColumns,
    optionContent,
    defaultRevealSpeech: () => 'התשובה הנכונה מהבהבת! לחץ עליה.',
    champSpeech: 'סיימת את כל רמות החשיבה! אתה אלוף חשיבה אמיתי! ממשיכים לשחק ולחשוב.'
  });

  return engine;
})();
