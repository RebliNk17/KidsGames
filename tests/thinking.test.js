/* בדיקת מחוללי רמות משחק החשיבה: נתונים, הרצה מרובה, ובדיקות ייעודיות לכל סוג תרגיל.
 * הרצה:  node tests/thinking.test.js
 */
const T = require('../js/thinking-levels.js');
const { LEVELS, ITEMS, itemOf, COUNT_ITEMS, DIFF_PAIRS, CATS, PAIRS, OPPOSITES, RIDDLES, STORIES, PROPS, SIZES, makeDeck } = T;

let fails = 0;
const err = msg => { fails++; console.error('  ✗ ' + msg); };
const NIKUD = /[֑-ׇ]/;

/* ─── נתונים ─── */
console.log(`בודק ${LEVELS.length} רמות חשיבה, ${ITEMS.length} תמונות...`);
if (LEVELS.length !== 20) err(`מספר רמות לא צפוי: ${LEVELS.length}`);

const icons = new Set();
LEVELS.forEach(L => {
  if (!L.name || !L.icon || !L.explain || !L.demoSpec || !L.gen) err(`רמה ${L.id}: חסרים שם/אייקון/הסבר/דוגמה/מחולל`);
  if (icons.has(L.icon)) err(`אייקון כפול באלבום: ${L.icon} (רמה ${L.id})`);
  icons.add(L.icon);
  if (NIKUD.test(L.name + L.explain)) err(`רמה ${L.id}: ניקוד בטקסט`);
});

const seenE = {};
ITEMS.forEach(it => {
  if (!it.e || !it.n) err(`פריט בלי אמוג'י או שם: ${JSON.stringify(it)}`);
  if (!['m', 'f', 'p'].includes(it.g)) err(`מין לא תקין לפריט ${it.n}: ${it.g}`);
  if (!Array.isArray(it.tags) || !it.tags.length) err(`פריט בלי תגיות: ${it.n}`);
  if (seenE[it.e]) err(`אמוג'י כפול במאגר: ${it.e} (${seenE[it.e]} / ${it.n})`);
  seenE[it.e] = it.n;
});
COUNT_ITEMS.forEach(c => { if (!c.p || !['m', 'f'].includes(c.g)) err(`פריט ספירה לא שלם: ${c.n}`); });

{
  const seen = new Set();
  DIFF_PAIRS.forEach(([a, b]) => {
    [a, b].forEach(x => { if (seen.has(x.e)) err(`אמוג'י כפול בזוגות "מי שונה": ${x.e}`); seen.add(x.e); if (!x.s || !x.p) err(`חסר יחיד/רבים ל-${x.e}`); });
  });
}
{
  const seenA = new Set(), seenB = new Set();
  PAIRS.forEach(p => {
    if (seenA.has(p.a.e)) err(`צד א כפול בזוגות: ${p.a.e}`);
    if (seenB.has(p.b.e)) err(`צד ב כפול בזוגות: ${p.b.e}`);
    seenA.add(p.a.e); seenB.add(p.b.e);
    if (!p.why || !p.grp) err(`זוג בלי הסבר/קבוצה: ${p.a.n}`);
    const others = PAIRS.filter(x => x !== p && x.grp !== p.grp);
    if (others.length < 3) err(`לזוג ${p.a.n} אין די מסיחים מקבוצות אחרות`);
  });
}
{
  const adjs = new Set();
  OPPOSITES.forEach(pair => pair.forEach(s => {
    if (adjs.has(s.adj)) err(`מילת הפכים כפולה: ${s.adj}`);
    adjs.add(s.adj);
    if (!s.e && !s.css) err(`צד הפכים בלי תמונה: ${s.adj}`);
    if (!s.n) err(`צד הפכים בלי שם: ${s.adj}`);
  }));
}
RIDDLES.forEach(r => {
  if (!itemOf(r.e)) err(`תשובת חידה לא במאגר: ${r.e}`);
  if (r.pool.length < 2) err(`לחידה ${r.e} פחות משני מסיחים`);
  r.pool.forEach(e => { if (!itemOf(e)) err(`מסיח חידה לא במאגר: ${e}`); if (e === r.e) err(`התשובה ${r.e} בין המסיחים של החידה שלה`); });
  if (!/מי אני\?|מה אני\?/.test(r.text)) err(`חידה בלי "מי/מה אני?": ${r.text}`);
});
STORIES.forEach((st, i) => {
  if (st.length < 2 || st.length > 3) err(`סיפור ${i}: אורך ${st.length}`);
  if (new Set(st.map(s => s.e)).size !== st.length) err(`סיפור ${i}: תמונה חוזרת`);
  st.forEach(s => { if (!s.n || !s.g) err(`סיפור ${i}: שלב בלי שם/מין`); });
});
CATS.forEach(c => {
  if (c.items.length < 4) err(`קטגוריה ${c.key}: פחות מ-4 חברים (${c.items.length})`);
  if (c.odds.length < 3) err(`קטגוריה ${c.key}: פחות מ-3 מסיחים (${c.odds.length})`);
  c.odds.forEach(o => { if (c.members(o)) err(`קטגוריה ${c.key}: ${o.n} גם חבר וגם "לא שייך"`); });
});

/* חפיסה */
{
  const d = makeDeck(['a', 'b', 'c']);
  const counts = { a: 0, b: 0, c: 0 };
  let prev = null;
  for (let i = 0; i < 300; i++) { const x = d(); if (x === prev) err(`החפיסה החזירה "${x}" פעמיים ברצף`); counts[x]++; prev = x; }
  if (counts.a !== 100 || counts.b !== 100 || counts.c !== 100) err(`החפיסה לא מאוזנת: ${JSON.stringify(counts)}`);
}

/* ─── בדיקת תרגיל ─── */
const EXPECT_TYPES = {
  1: ['spotDiff'], 2: ['shadow'], 3: ['memory'], 4: ['vanish'], 5: ['order'], 6: ['odd'], 7: ['pair'],
  8: ['opposite'], 9: ['pattern'], 10: ['riddle'], 11: ['position'], 12: ['story'], 13: ['compare'],
  14: ['beforeAfter'], 15: ['hidden'], 16: ['pattern'], 17: ['share'], 18: ['memory'], 19: ['vanish'],
  20: ['vanish', 'memory', 'pattern', 'hidden', 'share', 'riddle', 'position', 'compare', 'beforeAfter', 'spotDiff', 'order', 'story']
};

function checkQuestion(L, q, i) {
  const tag = `רמה ${L.id} (${L.name}) #${i} [${q.type}]`;
  if (!q.type || !EXPECT_TYPES[L.id].includes(q.type)) err(`${tag}: סוג תרגיל לא צפוי ברמה`);
  if (!q.key) err(`${tag}: חסר key`);
  if (!q.speech) err(`${tag}: חסר טקסט הקראה`);
  if (!q.hint) err(`${tag}: חסר רמז`);
  if (!q.prompt) err(`${tag}: חסר טקסט על המסך`);
  if (!['pick', 'build'].includes(q.kind)) err(`${tag}: kind לא מוכר ${q.kind}`);
  [q.prompt, q.speech, q.hint, q.revealSpeech || ''].forEach(s => { if (NIKUD.test(s)) err(`${tag}: ניקוד בטקסט: ${s}`); });

  if (q.kind === 'pick') {
    if (!Array.isArray(q.options) || q.options.length < 2) { err(`${tag}: options חסרות`); return; }
    const strs = q.options.map(String);
    if (new Set(strs).size !== strs.length) err(`${tag}: אפשרויות כפולות: ${q.options}`);
    if (!strs.includes(String(q.answer))) err(`${tag}: התשובה "${q.answer}" לא בין האפשרויות ${q.options}`);
    if (!q.revealSpeech) err(`${tag}: חסר revealSpeech`);
  }

  switch (q.type) {
    case 'spotDiff': {
      if (q.options.length !== 4 || q.cells.length !== 4) err(`${tag}: צריך בדיוק 4 תמונות`);
      const odd = q.cells[q.oddIdx];
      const same = q.cells.filter((_, k) => k !== q.oddIdx);
      if (same.some(c => c.e !== same[0].e || c.flip !== same[0].flip)) err(`${tag}: שלוש התמונות "הזהות" לא זהות`);
      if (odd.e === same[0].e && odd.flip === same[0].flip) err(`${tag}: השונה לא שונה`);
      if (q.variant === 'mirror' && !(odd.flip && odd.e === same[0].e)) err(`${tag}: בגרסת המראה השונה צריך להיות הפוך בלבד`);
      if (q.variant === 'color' && odd.flip) err(`${tag}: בגרסת הצבע אין היפוך`);
      q.options.forEach((o, k) => { if (!o.startsWith(k + ':')) err(`${tag}: ערך אפשרות לא מקודד מיקום: ${o}`); });
      if (q.answer !== q.options[q.oddIdx]) err(`${tag}: התשובה לא מצביעה על השונה`);
      break;
    }
    case 'shadow':
      if (q.answer !== q.visual.e || q.item.e !== q.answer) err(`${tag}: הצל לא של התשובה`);
      q.options.forEach(e => { if (!itemOf(e)) err(`${tag}: תמונה לא מוכרת ${e}`); });
      if (q.options.length !== 3) err(`${tag}: צריך 3 אפשרויות`);
      if (!q.speech.includes(q.items.map(x => x.n).join(', '))) err(`${tag}: ההקראה לא מונה את התמונות בסדר שעל המסך`);
      break;
    case 'memory': {
      const n = q.memory.pairs;
      if (q.memory.cards.length !== 2 * n) err(`${tag}: ${q.memory.cards.length} כרטיסים ל-${n} זוגות`);
      const cnt = {};
      q.memory.cards.forEach(e => { cnt[e] = (cnt[e] || 0) + 1; });
      Object.entries(cnt).forEach(([e, c]) => { if (c !== 2) err(`${tag}: ${e} מופיע ${c} פעמים`); if (!itemOf(e)) err(`${tag}: תמונה לא מוכרת ${e}`); });
      if (L.id === 3 && n !== 3) err(`${tag}: ברמה 3 יש 3 זוגות`);
      if (L.id === 18 && ![5, 6].includes(n)) err(`${tag}: ברמה 18 יש 5-6 זוגות`);
      break;
    }
    case 'vanish': {
      const { shown, gone } = q.vanish;
      const n = L.id === 4 ? 4 : L.id === 19 ? 6 : shown.length;
      if (shown.length !== n) err(`${tag}: ${shown.length} תמונות במקום ${n}`);
      if (new Set(shown).size !== shown.length) err(`${tag}: תמונה חוזרת`);
      if (!shown.includes(gone)) err(`${tag}: הנעלמת לא בין המוצגות`);
      if (q.answer !== gone || !q.options.includes(gone)) err(`${tag}: התשובה אינה הנעלמת`);
      q.options.forEach(e => { if (e !== gone && shown.includes(e)) err(`${tag}: מסיח ${e} מופיע גם על המסך`); });
      if (q.options.length !== (n === 4 ? 3 : 4)) err(`${tag}: ${q.options.length} אפשרויות`);
      if (new Set(q.options).size !== q.options.length) err(`${tag}: אפשרויות כפולות`);
      if (!q.afterSpeech) err(`${tag}: חסר afterSpeech`);
      break;
    }
    case 'order': {
      const { tiles, expected } = q.order;
      const asc = SIZES[expected.length];
      if (!asc) err(`${tag}: מספר גדלים לא נתמך ${expected.length}`);
      else if (expected.join() !== asc.join() && expected.join() !== asc.slice().reverse().join()) err(`${tag}: הסדר הצפוי לא עולה ולא יורד: ${expected}`);
      if (tiles.slice().sort().join() !== expected.slice().sort().join()) err(`${tag}: האריחים אינם הגדלים`);
      if (tiles.join() === expected.join()) err(`${tag}: האריחים כבר מסודרים`);
      if ((q.dir === 'asc') !== (expected.join() === asc.join())) err(`${tag}: dir לא תואם`);
      break;
    }
    case 'odd': {
      const cat = CATS.find(c => c.key === q.cat);
      if (!cat) { err(`${tag}: קטגוריה לא מוכרת ${q.cat}`); break; }
      if (q.group.length !== 3 || q.options.length !== 4) err(`${tag}: צריך 3 שייכים + 1`);
      q.group.forEach(it => { if (!cat.members(it)) err(`${tag}: ${it.n} לא שייך ל-${cat.key}`); });
      if (cat.members(q.odd)) err(`${tag}: "הלא שייך" ${q.odd.n} דווקא שייך ל-${cat.key}`);
      if (!cat.odds.includes(q.odd)) err(`${tag}: ${q.odd.n} אינו מסיח מותר ל-${cat.key}`);
      if (q.answer !== q.odd.e) err(`${tag}: התשובה אינה הלא-שייך`);
      if (!q.speech.includes(q.items.map(x => x.n).join(', '))) err(`${tag}: ההקראה לא מונה את התמונות בסדר שעל המסך`);
      break;
    }
    case 'pair': {
      if (q.answer !== q.pair.b.e) err(`${tag}: התשובה אינה בן הזוג`);
      if (q.visual.e !== q.pair.a.e) err(`${tag}: התמונה אינה צד א`);
      if (q.options.length !== 4) err(`${tag}: צריך 4 אפשרויות`);
      q.options.forEach(e => {
        if (e === q.pair.b.e) return;
        const other = PAIRS.find(p => p.b.e === e);
        if (!other) err(`${tag}: מסיח ${e} אינו בן זוג של אף זוג`);
        else if (other.grp === q.pair.grp) err(`${tag}: מסיח ${e} מאותה קבוצה (${other.grp}) - עלול להתאים גם`);
      });
      break;
    }
    case 'opposite': {
      const pair = OPPOSITES.find(p => p.includes(q.from) && p.includes(q.to));
      if (!pair || q.from === q.to) err(`${tag}: ${q.from.adj}/${q.to.adj} אינם זוג הפכים`);
      if (q.answer !== q.to.adj) err(`${tag}: התשובה אינה ההפך`);
      if (q.options.includes(q.from.adj)) err(`${tag}: המילה עצמה בין האפשרויות`);
      q.options.forEach(a => { if (!q.sides[a]) err(`${tag}: אין נתונים לאפשרות ${a}`); });
      if (q.options.length !== 3) err(`${tag}: צריך 3 אפשרויות`);
      break;
    }
    case 'pattern': {
      const { unit, len, missIdx, full } = q.pattern;
      if (full.length !== len + 1) err(`${tag}: אורך סדרה ${full.length} != ${len + 1}`);
      full.forEach((x, k) => {
        const letter = unit[k % unit.length];
        const first = full[unit.indexOf(letter)];
        if (x.key !== first.key) err(`${tag}: הסדרה לא עוקבת אחרי התבנית ${unit}`);
      });
      const distinct = new Set(unit).size;
      if (new Set(full.map(x => x.key)).size !== distinct) err(`${tag}: מספר פריטים שונים בסדרה לא תואם ל-${unit}`);
      if (q.visual.seq[missIdx] !== null) err(`${tag}: החור לא במקום`);
      if (q.answer !== full[missIdx].key) err(`${tag}: התשובה אינה הפריט החסר`);
      if (L.id === 9 && (missIdx !== len || !['AB', 'ABC'].includes(unit))) err(`${tag}: ברמה 9 החור בסוף ותבנית AB/ABC`);
      if (L.id === 16 && !['AAB', 'ABB', 'ABC', 'AABB'].includes(unit)) err(`${tag}: תבנית לא צפויה ברמה 16: ${unit}`);
      if (L.id === 16 && q.options.length !== 4) err(`${tag}: ברמה 16 יש 4 אפשרויות`);
      if (L.id === 9 && q.options.length !== 3) err(`${tag}: ברמה 9 יש 3 אפשרויות`);
      const kinds = new Set(q.options.map(k => q.items[k] && q.items[k].kind));
      if (kinds.size !== 1 || kinds.has(undefined)) err(`${tag}: אפשרויות מסוגים מעורבים`);
      if (!q.speech.includes('מה?')) err(`${tag}: ההקראה לא מציינת את החור`);
      break;
    }
    case 'riddle':
      if (q.answer !== q.riddle.e || q.item.e !== q.answer) err(`${tag}: התשובה אינה תשובת החידה`);
      q.options.forEach(e => { if (e !== q.riddle.e && !q.riddle.pool.includes(e)) err(`${tag}: מסיח ${e} לא ממאגר החידה`); });
      if (!q.speech.includes(q.riddle.text)) err(`${tag}: ההקראה לא כוללת את החידה`);
      if (q.options.length !== 3) err(`${tag}: צריך 3 אפשרויות`);
      break;
    case 'position': {
      const prop = PROPS.find(p => p.key === q.scene.prop);
      if (!prop) { err(`${tag}: אביזר לא מוכר`); break; }
      if (q.options.slice().sort().join() !== prop.pos.slice().sort().join()) err(`${tag}: האפשרויות אינן המיקומים של ${prop.key}`);
      if (!prop.pos.includes(q.answer) || q.pos !== q.answer) err(`${tag}: מיקום התשובה לא תקין`);
      if (!itemOf(q.scene.e)) err(`${tag}: חיה לא מוכרת`);
      const cue = T.POS_PHRASE[q.pos](prop.n);
      if (!q.speech.includes(cue) || !q.prompt.includes(cue)) err(`${tag}: הטקסט לא כולל "${cue}"`);
      break;
    }
    case 'story': {
      const { steps, tiles } = q.story;
      if (!STORIES.includes(steps)) err(`${tag}: סיפור לא מוכר`);
      if (tiles.slice().sort((a, b) => a.e < b.e ? -1 : 1).map(x => x.e).join() !== steps.slice().sort((a, b) => a.e < b.e ? -1 : 1).map(x => x.e).join()) err(`${tag}: האריחים אינם שלבי הסיפור`);
      if (tiles.map(x => x.e).join() === steps.map(x => x.e).join()) err(`${tag}: האריחים כבר מסודרים`);
      if (!q.doneSpeech) err(`${tag}: חסר doneSpeech`);
      break;
    }
    case 'compare': {
      const [a, b] = q.counts;
      if (a === b || a < 1 || b < 1 || a > 10 || b > 10) err(`${tag}: כמויות לא תקינות ${a},${b}`);
      if (q.options.slice().sort().join() !== [a, b].sort().join()) err(`${tag}: האפשרויות אינן שתי הכמויות`);
      if (q.answer !== (q.mode === 'more' ? Math.max(a, b) : Math.min(a, b))) err(`${tag}: תשובה שגויה ל-${q.mode}`);
      if (!q.speech.includes(q.mode === 'more' ? 'יותר' : 'פחות')) err(`${tag}: ההקראה לא מציינת יותר/פחות`);
      break;
    }
    case 'beforeAfter':
      if (q.answer !== (q.mode === 'after' ? q.n + 1 : q.n - 1)) err(`${tag}: תשובה שגויה`);
      if (q.answer < 1 || q.answer > 10) err(`${tag}: תשובה מחוץ ל-1..10`);
      q.options.forEach(o => { if (!Number.isInteger(o) || o < 1 || o > 10) err(`${tag}: אפשרות לא תקינה ${o}`); });
      if (q.options.length !== 3) err(`${tag}: צריך 3 אפשרויות`);
      break;
    case 'hidden':
      if (q.total < 3 || q.total > 6) err(`${tag}: סך הכול ${q.total}`);
      if (q.k < 1 || q.k > 3 || q.k >= q.total) err(`${tag}: מתחבאים ${q.k} מתוך ${q.total}`);
      if (q.answer !== q.k || q.visual.k !== q.k || q.visual.total !== q.total) err(`${tag}: התשובה/הוויזואל לא תואמים`);
      if (!q.revealSpeech.includes(String(q.total - q.k))) err(`${tag}: ההסבר לא מזכיר כמה נשארו בחוץ`);
      break;
    case 'share':
      if (![2, 3].includes(q.kids) || q.total !== q.kids * q.each) err(`${tag}: חלוקה לא תקינה ${q.total}/${q.kids}`);
      if (q.answer !== q.each) err(`${tag}: התשובה אינה החלק של כל ילד`);
      if (q.visual.kids.length !== q.kids) err(`${tag}: מספר ילדים בוויזואל`);
      break;
    default:
      err(`${tag}: סוג תרגיל לא מוכר`);
  }
}

/* ─── הרמות ─── */
for (const L of LEVELS) {
  const keys = [];
  for (let i = 0; i < 40; i++) keys.push(L.gen().key);
  for (let i = 1; i < keys.length; i++) if (keys[i] === keys[i - 1]) err(`רמה ${L.id}: אותה שאלה פעמיים ברצף (${keys[i]})`);
  if (new Set(keys).size < 12) err(`רמה ${L.id}: מעט מדי שאלות שונות ב-40 תרגילים (${new Set(keys).size})`);
  for (let i = 0; i < 400; i++) checkQuestion(L, L.gen(), i);
}

/* רמה 20 מערבבת באמת */
{
  const types = new Set();
  for (let i = 0; i < 300; i++) types.add(LEVELS[19].gen().type);
  if (types.size < 8) err(`רמה 20: רק ${types.size} סוגי תרגילים ב-300 הגרלות`);
}
/* רמה 16: יש גם חורים באמצע וגם בסוף */
{
  let mid = 0, end = 0;
  for (let i = 0; i < 200; i++) { const q = LEVELS[15].gen(); if (q.pattern.missIdx === q.pattern.len) end++; else mid++; }
  if (mid < 30 || end < 30) err(`רמה 16: חורים באמצע ${mid}, בסוף ${end} - לא מגוון`);
}
/* רמה 1: שתי הגרסאות מופיעות */
{
  let color = 0, mirror = 0;
  for (let i = 0; i < 200; i++) { const q = LEVELS[0].gen(); if (q.variant === 'mirror') mirror++; else color++; }
  if (color < 40 || mirror < 40) err(`רמה 1: צבע ${color}, מראה ${mirror} - לא מגוון`);
}

if (fails === 0) {
  console.log(`✓ כל בדיקות החשיבה עברו! (${ITEMS.length} תמונות, ${RIDDLES.length} חידות, ${PAIRS.length} זוגות)`);
  process.exit(0);
} else {
  console.error(`✗ ${fails} כשלונות`);
  process.exit(1);
}
