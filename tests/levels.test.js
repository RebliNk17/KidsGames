/* בדיקת כל מחוללי הרמות: מריצים כל מחולל מאות פעמים ומוודאים תקינות.
 * הרצה:  node tests/levels.test.js
 */
const { LEVELS } = require('../js/levels.js');

let fails = 0;
const err = msg => { fails++; console.error('  ✗ ' + msg); };

function checkQuestion(L, q, i) {
  const tag = `רמה ${L.id} (${L.name}) #${i}`;

  if (!Number.isInteger(q.answer)) err(`${tag}: answer לא מספר שלם: ${q.answer}`);
  if (q.answer < 0) err(`${tag}: answer שלילי: ${q.answer}`);

  if (!Array.isArray(q.options) || q.options.length < 2) {
    err(`${tag}: options חסרות`);
    return;
  }
  if (!q.options.includes(q.answer)) {
    err(`${tag}: התשובה ${q.answer} לא בין האפשרויות ${q.options}`);
  }
  if (new Set(q.options).size !== q.options.length) {
    err(`${tag}: אפשרויות כפולות: ${q.options}`);
  }
  if (q.options.some(o => !Number.isInteger(o) || o < 0)) {
    err(`${tag}: אפשרות לא חוקית: ${q.options}`);
  }
  if (!q.speech) err(`${tag}: חסר טקסט הקראה`);
  if (!q.hint) err(`${tag}: חסר רמז`);

  // בדיקות לפי סוג
  if (q.kind === 'count') {
    if (q.visual.count !== q.answer) err(`${tag}: ספירה - visual ${q.visual.count} != answer ${q.answer}`);
    if (q.answer < 1 || q.answer > 10) err(`${tag}: ספירה מחוץ לטווח: ${q.answer}`);
  }

  if (q.kind === 'expr') {
    const t = q.tokens;
    if (!t || t.length < 5) err(`${tag}: tokens חסרים`);
    // חישוב הביטוי המלא אחרי הצבת התשובה
    const solved = t.map(x => (x === '?' ? q.answer : x));
    const eq = solved.indexOf('=');
    const left = solved.slice(0, eq);
    const right = solved[eq + 1];
    let val = left[0];
    for (let k = 1; k < left.length; k += 2) {
      const op = left[k], num = left[k + 1];
      if (op === '+') val += num;
      else if (op === '−') val -= num;
      else if (op === '×') val *= num;
      else err(`${tag}: אופרטור לא מוכר ${op}`);
    }
    if (val !== right) err(`${tag}: הביטוי לא מסתדר: ${solved.join(' ')} (יצא ${val})`);
  }

  if (q.kind === 'compare') {
    const { a, b, mode } = q.compare;
    const expected = mode === 'big' ? Math.max(a, b) : Math.min(a, b);
    if (q.answer !== expected) err(`${tag}: השוואה שגויה a=${a} b=${b} mode=${mode} answer=${q.answer}`);
    if (a === b) err(`${tag}: השוואה עם מספרים שווים`);
  }

  if (q.kind === 'seq') {
    const idx = q.seq.indexOf(null);
    if (idx === -1) err(`${tag}: אין חור בסדרה`);
    const known = q.seq.find(x => x !== null);
    const knownIdx = q.seq.indexOf(known);
    if (known - knownIdx + idx !== q.answer) err(`${tag}: סדרה שגויה ${q.seq} answer=${q.answer}`);
  }

  // ויזואל של חיסור חייב להתאים לתרגיל
  if (q.visual && q.visual.type === 'sub') {
    if (q.visual.total - q.visual.take !== q.answer) {
      err(`${tag}: ויזואל חיסור לא תואם: ${q.visual.total}-${q.visual.take} != ${q.answer}`);
    }
  }

  if (q.visual && q.visual.type === 'groups') {
    const sum = q.visual.groups.reduce((s, g) => s + g.count, 0);
    if (sum !== q.answer) err(`${tag}: ויזואל קבוצות לא תואם: סכום ${sum} != ${q.answer}`);
    if (q.visual.groups.some(g => g.count > 20)) err(`${tag}: קבוצה גדולה מדי`);
  }

  if (q.visual && q.visual.type === 'blocks') {
    q.visual.parts.forEach(p => {
      if (p.tens < 0 || p.tens > 9 || p.units < 0 || p.units > 9) {
        err(`${tag}: בלוקים מחוץ לטווח: ${JSON.stringify(p)}`);
      }
    });
  }
}

console.log(`בודק ${LEVELS.length} רמות, 400 תרגילים לכל רמה...`);
if (LEVELS.length !== 20) err(`מספר רמות לא צפוי: ${LEVELS.length}`);

for (const L of LEVELS) {
  if (!L.name || !L.icon || !L.explain) err(`רמה ${L.id}: חסרים שם/אייקון/הסבר`);
  const d = L.demo();
  checkQuestion(L, d, 'demo');
  for (let i = 0; i < 400; i++) checkQuestion(L, L.gen(), i);
}

if (fails === 0) {
  console.log('✓ כל הבדיקות עברו!');
  process.exit(0);
} else {
  console.error(`✗ ${fails} כשלונות`);
  process.exit(1);
}
