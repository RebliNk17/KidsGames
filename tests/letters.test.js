/* בדיקת מחוללי רמות האותיות: הרצה מרובה + בדיקות ייעודיות לכל סוג תרגיל.
 * הרצה:  node tests/letters.test.js
 */
const LL = require('../js/letters-levels.js');
const { LEVELS, LETTERS, byChar, WORDS, FINALS, END_CHARS, sameSound, makeDeck } = LL;

let fails = 0;
const err = msg => { fails++; console.error('  ✗ ' + msg); };

const finToReg = {};
FINALS.forEach(f => { finToReg[f.fin] = f.reg; });
const ALL_CHARS = LETTERS.map(L => L.ch);
const byEmoji = {};
WORDS.forEach(w => { byEmoji[w.e] = w; });

const NIKUD = /[֑-ׇ]/;       // סימני ניקוד וטעמים
const HEB_ONLY = /^[א-ת]+$/;
const SYL_HE = { 1: 'הברה אחת', 2: 'שתי הברות', 3: 'שלוש הברות' };

/* כל מה שמוצג על המסך בתרגיל */
function displayed(q) {
  const out = [q.prompt || ''];
  if (q.visual) {
    if (q.visual.e) out.push(q.visual.e);
    if (q.visual.text) out.push(q.visual.text);
    if (q.visual.units) out.push(q.visual.units.join(''));
  }
  (q.options || []).forEach(o => out.push(String(o)));
  if (q.build) out.push(q.build.tiles.join(''));
  return out;
}

/* מסיחי אותיות: לא נשמעים כמו התשובה, ומהמאגר הנכון (רגילות / צורות סוף-מילה) */
function checkLetterOptions(tag, q, pool) {
  q.options.forEach(o => {
    if (o !== q.answer && sameSound(o, q.answer)) err(`${tag}: מסיח "${o}" נשמע כמו התשובה "${q.answer}"`);
    if (!pool.includes(o)) err(`${tag}: האות "${o}" לא במאגר המסיחים המתאים`);
  });
}

/* תרגילי תמונות: כל התמונות הן מילים מהמאגר, ומקריאים את השמות בסדר שעל המסך */
function checkPictureOptions(tag, q) {
  const words = q.options.map(e => byEmoji[e]);
  if (words.some(w => !w)) { err(`${tag}: תמונה לא מוכרת בין האפשרויות ${q.options}`); return null; }
  const names = words.map(w => w.w).join(', ');
  if (!q.speech.includes(names)) err(`${tag}: ההקראה לא מונה את התמונות בסדר שעל המסך (${names}): ${q.speech}`);
  return words;
}

const HIDE_WORD = ['find', 'first', 'last', 'syl', 'missing', 'build', 'pickWord'];

function checkQuestion(L, q, i) {
  const tag = `רמה ${L.id} (${L.name}) #${i} [${q.type}]`;

  if (!q.type) err(`${tag}: חסר type`);
  if (!q.key) err(`${tag}: חסר key למניעת חזרות`);
  if (!q.speech) err(`${tag}: חסר טקסט הקראה`);
  if (!q.hint) err(`${tag}: חסר רמז`);

  displayed(q).forEach(s => { if (NIKUD.test(s)) err(`${tag}: ניקוד על המסך: "${s}"`); });
  // המילה עצמה (כמילה שלמה, לא כחלק ממילה אחרת כמו "פה" בתוך "איפה") אסור שתהיה על המסך
  if (HIDE_WORD.includes(q.type) && q.word && q.prompt.split(/[^א-ת]+/).includes(q.word.w)) {
    err(`${tag}: המילה "${q.word.w}" כתובה על המסך - הילד יכול לראות את התשובה`);
  }

  if (q.kind === 'build') {
    if (!q.build || !q.build.units.length) { err(`${tag}: build ריק`); return; }
    if (q.build.tiles.slice().sort().join('|') !== q.build.units.slice().sort().join('|')) err(`${tag}: האריחים אינם תמורה של המילה`);
    if (q.build.units.join('') !== q.word.w) err(`${tag}: יחידות לא תואמות למילה`);
    return;
  }

  if (!Array.isArray(q.options) || q.options.length < 2) { err(`${tag}: options חסרות`); return; }
  if (!q.options.map(String).includes(String(q.answer))) err(`${tag}: התשובה "${q.answer}" לא בין האפשרויות ${q.options}`);
  if (new Set(q.options.map(String)).size !== q.options.length) err(`${tag}: אפשרויות כפולות: ${q.options}`);

  switch (q.type) {
    case 'find':
    case 'first':
      if (q.answer !== q.word.first) err(`${tag}: התשובה "${q.answer}" אינה האות הראשונה של ${q.word.w}`);
      checkLetterOptions(tag, q, ALL_CHARS);
      break;

    case 'last':
      if (q.answer !== q.word.last) err(`${tag}: התשובה "${q.answer}" אינה האות האחרונה של ${q.word.w}`);
      checkLetterOptions(tag, q, END_CHARS);
      break;

    case 'final': {
      const shown = q.visual.text;
      const expected = finToReg[shown] || (byChar[shown] && byChar[shown].final);
      if (q.answer !== expected) err(`${tag}: מוצג "${shown}" אבל התשובה "${q.answer}"`);
      break;
    }

    case 'syl':
      if (![1, 2, 3].includes(q.answer) || q.answer !== q.word.syl) err(`${tag}: מספר הברות שגוי: ${q.answer} (${q.word.w})`);
      if (q.options.slice().sort().join() !== '1,2,3') err(`${tag}: אפשרויות ההברות ${q.options}`);
      if (/מחיאות|מחיאת|כפיים/.test(q.speech + q.hint + q.revealSpeech + q.prompt)) err(`${tag}: משתמשים במילה "מחיאות כף" במקום "הברות"`);
      break;

    case 'startsWith':
    case 'endsWith': {
      const ch = q.visual.text;
      const at = w => (q.type === 'startsWith' ? w.first : w.last);
      if (q.answer !== q.word.e || at(q.word) !== ch) err(`${tag}: המילה ${q.word.w} לא מתאימה לאות ${ch}`);
      const words = checkPictureOptions(tag, q);
      if (words) words.forEach(w => {
        if (w !== q.word && sameSound(at(w), ch)) err(`${tag}: המסיח ${w.w} גם מתאים לאות ${ch}`);
      });
      break;
    }

    case 'sameStart': {
      const shown = byEmoji[q.visual.e];
      if (!shown) { err(`${tag}: התמונה הגדולה לא מוכרת`); break; }
      if (q.word === shown || q.word.first !== shown.first) err(`${tag}: ${q.word.w} לא מתחילה כמו ${shown.w}`);
      if (q.answer !== q.word.e) err(`${tag}: התשובה אינה התמונה של ${q.word.w}`);
      const words = checkPictureOptions(tag, q);
      if (words) words.forEach(w => {
        if (w !== q.word && sameSound(w.first, shown.first)) err(`${tag}: המסיח ${w.w} גם מתחיל כמו ${shown.w}`);
        if (w === shown) err(`${tag}: התמונה הגדולה בין האפשרויות`);
      });
      break;
    }

    case 'sylPick': {
      const n = Number(q.visual.text);
      if (q.word.syl !== n || q.answer !== q.word.e) err(`${tag}: ${q.word.w} אינה בעלת ${n} הברות`);
      if (!q.prompt.includes(SYL_HE[n])) err(`${tag}: הטקסט לא מציין ${SYL_HE[n]}`);
      const words = checkPictureOptions(tag, q);
      if (words && new Set(words.map(w => w.syl)).size !== words.length) err(`${tag}: שתי תמונות עם אותו מספר הברות`);
      break;
    }

    case 'read':
      if (q.answer !== q.word.e) err(`${tag}: התשובה אינה האמוג'י של המילה`);
      if (q.visual.units.join('') !== q.word.w) err(`${tag}: המילה המוצגת שונה מהמילה`);
      if (q.word.xl) err(`${tag}: מילה ארוכה מדי לקריאה: ${q.word.w}`);
      q.options.forEach(e => { if (!byEmoji[e]) err(`${tag}: תמונה לא מוכרת ${e}`); });
      break;

    case 'pickWord':
      if (q.answer !== q.word.w) err(`${tag}: התשובה אינה המילה הכתובה`);
      q.options.forEach(o => { if (!LL.wordOf(o)) err(`${tag}: מילה לא מוכרת "${o}"`); });
      break;

    case 'missing': {
      const expected = q.word.u[q.blankIdx];
      if (q.answer !== expected) err(`${tag}: אות חסרה שגויה: ${q.answer} != ${expected} (${q.word.w})`);
      if (q.visual.blankIdx !== q.blankIdx) err(`${tag}: מיקום החור לא תואם`);
      checkLetterOptions(tag, q, q.blankIdx === q.word.len - 1 ? END_CHARS : ALL_CHARS);
      break;
    }

    default:
      err(`${tag}: סוג תרגיל לא מוכר`);
  }
}

console.log(`בודק ${LEVELS.length} רמות אותיות, 400 תרגילים לכל רמה...`);
if (LEVELS.length !== 20) err(`מספר רמות לא צפוי: ${LEVELS.length}`);

/* ─── בדיקות נתונים ─── */
LETTERS.forEach(L => {
  if (!L.kws || L.kws.length < 2) err(`לאות ${L.ch} פחות משתי מילות מפתח`);
  L.kws.forEach(kw => { if (kw.first !== L.ch) err(`מילת המפתח "${kw.w}" לא מתחילה באות ${L.ch}`); });
  if (NIKUD.test(L.ch)) err(`ניקוד באות ${L.ch}`);
});

const seenW = {}, seenE = {};
WORDS.forEach(w => {
  if (!HEB_ONLY.test(w.w)) err(`המילה "${w.w}" מכילה תווים שאינם אותיות (ניקוד? גרש?)`);
  if (w.len < 2) err(`מילה קצרה מדי: ${w.w}`);
  if (!w.e) err(`למילה ${w.w} אין אמוג'י`);
  if (seenW[w.w]) err(`מילה כפולה: ${w.w}`);
  if (seenE[w.e]) err(`אמוג'י כפול ${w.e}: ${seenE[w.e]} / ${w.w}`);
  seenW[w.w] = 1; seenE[w.e] = w.w;
  w.u.slice(0, -1).forEach(ch => { if (finToReg[ch]) err(`אות סופית באמצע המילה ${w.w}`); });
  if (byChar[w.last] && byChar[w.last].final) err(`המילה ${w.w} נגמרת בצורה רגילה במקום סופית`);
  if (w.syl !== null && ![1, 2, 3].includes(w.syl)) err(`מספר הברות לא נתמך במילה ${w.w}: ${w.syl}`);
});

[2, 3, 4].forEach(len => {
  const n = WORDS.filter(w => w.len === len).length;
  if (n < 12) err(`מעט מדי מילים באורך ${len}: ${n}`);
});
if (WORDS.length < 120) err(`מאגר המילים קטן מדי: ${WORDS.length}`);

/* ─── חפיסה: אין חזרה רצופה, וכל פריט מופיע אותו מספר פעמים ─── */
{
  const d = makeDeck(['a', 'b', 'c']);
  const counts = { a: 0, b: 0, c: 0 };
  let prev = null;
  for (let i = 0; i < 300; i++) {
    const x = d();
    if (x === prev) err(`החפיסה החזירה "${x}" פעמיים ברצף`);
    counts[x]++;
    prev = x;
  }
  if (counts.a !== 100 || counts.b !== 100 || counts.c !== 100) err(`החפיסה לא מאוזנת: ${JSON.stringify(counts)}`);
}

/* ─── הרמות ─── */
const demoWords = spec => {
  const specs = Array.isArray(spec) ? spec : [spec];
  const out = [];
  specs.forEach(s => {
    if (s.word) out.push(s.word);
    if (s.words) out.push(...s.words);
    if (s.items) s.items.forEach(it => out.push(it.word));
  });
  return out;
};

for (const L of LEVELS) {
  if (!L.name || !L.icon || !L.explain) err(`רמה ${L.id}: חסרים שם/אייקון/הסבר`);
  if (!L.demoSpec) err(`רמה ${L.id}: חסרה דוגמה להסבר`);
  if (NIKUD.test(L.name + L.explain)) err(`רמה ${L.id}: ניקוד בטקסט ההסבר`);
  if (/מחיאות|מחיאת/.test(L.name + L.explain)) err(`רמה ${L.id}: "מחיאות כף" במקום "הברות"`);
  demoWords(L.demoSpec).forEach(w => { if (!LL.wordOf(w)) err(`רמה ${L.id}: מילת הדוגמה "${w}" לא במאגר`); });

  // אין שתי שאלות זהות ברצף, ויש מגוון
  const keys = [];
  for (let i = 0; i < 40; i++) keys.push(L.gen().key);
  for (let i = 1; i < keys.length; i++) if (keys[i] === keys[i - 1]) err(`רמה ${L.id}: אותה שאלה פעמיים ברצף (${keys[i]})`);
  if (new Set(keys).size < 12) err(`רמה ${L.id}: מעט מדי שאלות שונות ב-40 תרגילים (${new Set(keys).size})`);

  for (let i = 0; i < 400; i++) checkQuestion(L, L.gen(), i);
}

/* ─── אותיות סופיות מופיעות "מידי פעם" גם אחרי הרמה שלהן ─── */
[11, 13].forEach(id => {
  const L = LEVELS[id - 1];
  let finals = 0;
  for (let i = 0; i < 300; i++) {
    const q = L.gen();
    if (q.type === 'final' || ((q.type === 'last' || q.type === 'endsWith') && finToReg[q.type === 'last' ? q.answer : q.visual.text])) finals++;
  }
  if (finals < 20) err(`רמה ${id}: אותיות סופיות כמעט לא מופיעות (${finals}/300)`);
});

if (fails === 0) {
  console.log(`✓ כל בדיקות האותיות עברו! (${WORDS.length} מילים)`);
  process.exit(0);
} else {
  console.error(`✗ ${fails} כשלונות`);
  process.exit(1);
}
