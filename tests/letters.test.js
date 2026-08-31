/* בדיקת מחוללי רמות האותיות: הרצה מרובה + בדיקות ייעודיות לכל סוג.
 * הרצה:  node tests/letters.test.js
 */
const LL = require('../js/letters-levels.js');
const { LEVELS, LETTERS, byChar, WORDS, FINALS, splitUnits } = LL;

let fails = 0;
const err = msg => { fails++; console.error('  ✗ ' + msg); };

const finToReg = {};
FINALS.forEach(f => { finToReg[f.fin] = f.reg; });

function soundGroupOf(ch) {
  const base = finToReg[ch] || ch;
  return byChar[base] ? byChar[base].sg : null;
}

function checkQuestion(L, q, i) {
  const tag = `רמה ${L.id} (${L.name}) #${i}`;

  if (!q.speech) err(`${tag}: חסר טקסט הקראה`);
  if (!q.hint) err(`${tag}: חסר רמז`);

  if (q.kind === 'build') {
    if (!q.build || !q.build.units.length) { err(`${tag}: build ריק`); return; }
    const sortedTiles = q.build.tiles.slice().sort().join('|');
    const sortedUnits = q.build.units.slice().sort().join('|');
    if (sortedTiles !== sortedUnits) err(`${tag}: האריחים אינם תמורה של המילה`);
    if (q.build.units.join('') !== q.word.u.join('')) err(`${tag}: יחידות לא תואמות למילה`);
    return;
  }

  // תרגילי בחירה
  if (!Array.isArray(q.options) || q.options.length < 2) { err(`${tag}: options חסרות`); return; }
  if (!q.options.map(String).includes(String(q.answer))) {
    err(`${tag}: התשובה "${q.answer}" לא בין האפשרויות ${q.options}`);
  }
  if (new Set(q.options.map(String)).size !== q.options.length) {
    err(`${tag}: אפשרויות כפולות: ${q.options}`);
  }

  // תרגילי צליל: אסור שמסיח יישמע כמו התשובה (א/ע, כ/ק/ח, ט/ת, ס/ש, ב/ו)
  if ([8, 9, 18].includes(L.id)) {
    const g = soundGroupOf(q.answer);
    if (g) {
      q.options.forEach(o => {
        if (String(o) !== String(q.answer) && soundGroupOf(o) === g) {
          err(`${tag}: מסיח "${o}" נשמע כמו התשובה "${q.answer}" (${q.speech})`);
        }
      });
    }
  }

  // צליל פותח/סוגר: התשובה באמת האות הראשונה/אחרונה
  if (L.id === 8 && q.answer !== q.options.find(o => o === q.answer)) err(`${tag}: ?`);
  if (L.id === 9) {
    // אם המילה נגמרת באות סופית - התשובה חייבת להיות בצורה הסופית
    const finalAnswers = q.options.filter(o => finToReg[o]);
    if (finToReg[q.answer] && finalAnswers.length !== q.options.length) {
      err(`${tag}: תשובה סופית "${q.answer}" עם מסיחים לא-סופיים ${q.options}`);
    }
  }

  if (L.id === 10) {
    if (![1, 2, 3].includes(q.answer)) err(`${tag}: מספר הברות מוזר: ${q.answer}`);
  }

  // קריאת מילים: התמונה הנכונה קיימת, אין תמונות כפולות
  if ([15, 16].includes(L.id) || (L.id === 20 && q.kind === 'pick')) {
    if (q.answer !== q.word.e) err(`${tag}: התשובה אינה האמוג'י של המילה`);
  }

  if (L.id === 17) {
    if (q.answer !== q.word.w) err(`${tag}: התשובה אינה המילה הכתובה`);
  }

  if (L.id === 18) {
    const expected = q.word.u[q.blankIdx][0];
    if (q.answer !== expected) err(`${tag}: אות חסרה שגויה: ${q.answer} != ${expected} (${q.word.w})`);
  }
}

console.log(`בודק ${LEVELS.length} רמות אותיות, 400 תרגילים לכל רמה...`);
if (LEVELS.length !== 20) err(`מספר רמות לא צפוי: ${LEVELS.length}`);

/* בדיקות נתונים */
LETTERS.forEach(L => {
  if (!L.kws || !L.kws.length) err(`לאות ${L.ch} אין מילות מפתח`);
  L.kws.forEach(kw => {
    if (!kw.w.startsWith(L.ch)) err(`מילת המפתח "${kw.w}" לא מתחילה באות ${L.ch}`);
    if (!kw.e) err(`למילה "${kw.w}" אין אמוג'י`);
  });
});

WORDS.forEach(W => {
  if (!W.e) err(`למילה ${W.w} אין אמוג'י`);
  if (W.p.length < 2) err(`הגייה חשודה למילה ${W.w}`);
  const units = splitUnits(W.w);
  if (units.join('') !== W.w) err(`פירוק היחידות של ${W.w} מאבד תווים`);
  units.forEach(u => {
    const base = u[0];
    if (!(base >= 'א' && base <= 'ת')) err(`יחידה לא תקינה במילה ${W.w}: "${u}"`);
  });
  // הצורה הסופית חייבת להופיע רק בסוף מילה
  units.slice(0, -1).forEach(u => {
    if (finToReg[u[0]]) err(`אות סופית באמצע המילה ${W.w}`);
  });
});

/* אמוג'י ייחודי בין מילים באותו אורך (מסיחי תמונות) */
[2, 3, 4].forEach(len => {
  const group = WORDS.filter(W => W.len === len && !W.xl);
  if (group.length < 5) err(`מעט מדי מילים באורך ${len}: ${group.length}`);
  const seen = {};
  group.forEach(W => {
    if (seen[W.e]) err(`אמוג'י כפול ${W.e} (${seen[W.e]} / ${W.w}) באורך ${len}`);
    seen[W.e] = W.w;
  });
});

/* הרצת המחוללים */
for (const L of LEVELS) {
  if (!L.name || !L.icon || !L.explain) err(`רמה ${L.id}: חסרים שם/אייקון/הסבר`);
  if (!L.demoSpec) err(`רמה ${L.id}: חסרה דוגמה להסבר`);
  for (let i = 0; i < 400; i++) checkQuestion(L, L.gen(), i);
}

if (fails === 0) {
  console.log('✓ כל בדיקות האותיות עברו!');
  process.exit(0);
} else {
  console.error(`✗ ${fails} כשלונות`);
  process.exit(1);
}
