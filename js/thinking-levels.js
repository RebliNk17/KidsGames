/* ═══════════════ משחק החשיבה - 20 רמות לגיל 3 עד 5 ═══════════════
 * משחק לילד שכבר מכיר צבעים, צורות וסופר עד 10 - ועדיין לא קורא.
 * הרמות מפתחות תפיסה חזותית, זיכרון, מיון והסקה. מספרים מופיעים רק
 * כהסקה (יותר/פחות, לפני/אחרי, כמה מתחבאים, חלוקה שווה), בלי ספירה סתמית.
 *
 *   עיניים וזיכרון (1-5):   מי שונה, של מי הצל, זיכרון, מה נעלם, סדר לפי גודל
 *   חושבים (6-12):          מי לא שייך, מה הולך ביחד, הפכים, סדרות, חידות,
 *                           איפה החתול (מיקום), מה קורה קודם (סידור סיפור)
 *   מספרים לחושבים (13-17): איפה יש יותר, לפני ואחרי, כמה מתחבאים,
 *                           סדרות קשות, חלוקה שווה
 *   סיום (18-20):           זיכרון גדול, מה נעלם עם שש תמונות, אלוף החשיבה
 *
 * עקרונות:
 * - הילד לא קורא: כל ההוראות בקול. הטקסט על המסך מיועד להורה.
 * - 2 עד 4 כפתורים גדולים, בלי ניקוד, הכול אמוג'י ו-CSS.
 * - כל מאגר נשלף מ"חפיסה" מעורבבת: לא חוזרים על פריט עד שהחפיסה נגמרת.
 * - בתרגילי תמונות מקריאים את שמות כל התמונות בסדר שבו הן על המסך.
 * - שאלות בחירה (kind: 'pick') מטופלות במנוע; שאלות פעולה (kind: 'build')
 *   מצוירות ב-thinking-game.js: זיכרון, מה נעלם, סדר לפי גודל, סידור סיפור.
 * המחוללים טהורים (בלי DOM) כדי שאפשר לבדוק אותם ב-node.
 */

const ThinkingLevels = (() => {

  /* ─── עזרים ─── */
  const ri = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const pick = arr => arr[ri(0, arr.length - 1)];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = ri(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* חפיסה: מערבבים, שולפים אחד-אחד, וכשנגמר מערבבים מחדש.
     הפריט הראשון בסבב חדש לעולם לא יהיה זה שסגר את הסבב הקודם. */
  function makeDeck(items) {
    let queue = [];
    let last = null;
    return () => {
      if (!queue.length) {
        queue = shuffle(items);
        if (queue.length > 1 && queue[queue.length - 1] === last) queue.unshift(queue.pop());
      }
      last = queue.pop();
      return last;
    };
  }

  const decks = {};
  const draw = (key, items) => (decks[key] || (decks[key] = makeDeck(items)))();

  /* בחירה לפי משקלים: mix([[3, fnA], [1, fnB]]) - fnA נבחרת פי 3 יותר */
  function mix(entries) {
    const total = entries.reduce((s, e) => s + e[0], 0);
    let r = Math.random() * total;
    for (const [w, fn] of entries) {
      r -= w;
      if (r < 0) return fn();
    }
    return entries[entries.length - 1][1]();
  }

  /* n פריטים שונים מתוך מאגר, בלי אלה שב-exclude */
  function take(pool, n, exclude = []) {
    const out = [];
    for (const x of shuffle(pool)) {
      if (out.length >= n) break;
      if (exclude.includes(x) || out.includes(x)) continue;
      if (exclude.some(y => y.e && y.e === x.e) || out.some(y => y.e && y.e === x.e)) continue;
      out.push(x);
    }
    return out;
  }

  /* "כלב, חתול ופרה" */
  const heList = names => names.length <= 1 ? names.join('')
    : names.slice(0, -1).join(', ') + ' ו' + names[names.length - 1];
  const namesOf = items => items.map(x => x.n).join(', ');
  const on = g => ({ m: 'עליו', f: 'עליה', p: 'עליהם' })[g] || 'עליו';
  const thisIs = g => ({ m: 'זה', f: 'זאת', p: 'אלה' })[g] || 'זה';

  const LISTEN = { type: 'listen', e: '👂' };

  /* ─── מאגר התמונות ─── */
  /* e אמוג'י (ייחודי), n שם, g מין (m/f/p=רבים), tags תגיות:
     animal/food/vehicle/clothes/toy/thing/nature - קטגוריות
     fly/water/hot/cold/sky/round/angular/ground - קטגוריות "עדינות" ל"מי לא שייך"
     body - צורה שלמה וברורה (לצלליות ולסדר לפי גודל)
     faces - מסתכל לצד אחד (אפשר להפוך אותו ב"מי שונה") */
  const I = (e, n, g, tags) => ({ e, n, g, tags });
  const ITEMS = [
    // חיות
    I('🐶', 'כלב', 'm', ['animal', 'ground']),
    I('🐱', 'חתול', 'm', ['animal', 'ground']),
    I('🐮', 'פרה', 'f', ['animal', 'ground']),
    I('🐷', 'חזיר', 'm', ['animal', 'ground']),
    I('🐸', 'צפרדע', 'f', ['animal', 'water']),
    I('🦁', 'אריה', 'm', ['animal', 'ground']),
    I('🐘', 'פיל', 'm', ['animal', 'ground', 'body', 'faces']),
    I('🐰', 'ארנב', 'm', ['animal', 'ground']),
    I('🐻', 'דוב', 'm', ['animal', 'ground']),
    I('🐵', 'קוף', 'm', ['animal', 'ground']),
    I('🐔', 'תרנגולת', 'f', ['animal']),
    I('🦆', 'ברווז', 'm', ['animal', 'body', 'faces']),
    I('🐟', 'דג', 'm', ['animal', 'water', 'body', 'faces']),
    I('🐢', 'צב', 'm', ['animal', 'ground', 'body', 'faces']),
    I('🐑', 'כבשה', 'f', ['animal', 'ground', 'body', 'faces']),
    I('🐎', 'סוס', 'm', ['animal', 'ground', 'body', 'faces']),
    I('🦋', 'פרפר', 'm', ['animal', 'fly', 'body']),
    I('🐥', 'אפרוח', 'm', ['animal']),
    I('🦒', "ג'ירפה", 'f', ['animal', 'ground', 'body', 'faces']),
    I('🐍', 'נחש', 'm', ['animal', 'ground', 'body', 'faces']),
    I('🐬', 'דולפין', 'm', ['animal', 'water', 'body', 'faces']),
    I('🐙', 'תמנון', 'm', ['animal', 'water', 'body']),
    I('🦀', 'סרטן', 'm', ['animal', 'water', 'body']),
    I('🐫', 'גמל', 'm', ['animal', 'ground', 'body', 'faces']),
    I('🦖', 'דינוזאור', 'm', ['animal', 'ground', 'body', 'faces']),
    I('🐊', 'תנין', 'm', ['animal', 'water', 'body', 'faces']),
    I('🐧', 'פינגווין', 'm', ['animal', 'cold', 'body']),
    I('🐝', 'דבורה', 'f', ['animal', 'fly', 'body', 'faces']),
    I('🐦', 'ציפור', 'f', ['animal', 'fly', 'body', 'faces']),
    I('🦅', 'נשר', 'm', ['animal', 'fly', 'body', 'faces']),
    I('🦇', 'עטלף', 'm', ['animal', 'fly', 'body']),
    I('🐳', 'לווייתן', 'm', ['animal', 'water', 'body', 'faces']),
    I('🦈', 'כריש', 'm', ['animal', 'water', 'body', 'faces']),
    I('🐭', 'עכבר', 'm', ['animal', 'ground']),
    I('🐯', 'נמר', 'm', ['animal', 'ground']),
    I('🐼', 'פנדה', 'f', ['animal', 'ground']),
    // אוכל
    I('🍎', 'תפוח', 'm', ['food', 'round']),
    I('🍌', 'בננה', 'f', ['food']),
    I('🍕', 'פיצה', 'f', ['food']),
    I('🍞', 'לחם', 'm', ['food']),
    I('🥕', 'גזר', 'm', ['food']),
    I('🍓', 'תות', 'm', ['food']),
    I('🍉', 'אבטיח', 'm', ['food']),
    I('🧀', 'גבינה', 'f', ['food']),
    I('🍪', 'עוגייה', 'f', ['food', 'round']),
    I('🥚', 'ביצה', 'f', ['food']),
    I('🍦', 'גלידה', 'f', ['food', 'cold']),
    I('🍒', 'דובדבנים', 'p', ['food']),
    I('🎂', 'עוגה', 'f', ['food']),
    I('🍩', 'סופגנייה', 'f', ['food', 'round']),
    I('🍇', 'ענבים', 'p', ['food']),
    I('🍊', 'תפוז', 'm', ['food', 'round']),
    I('🍋', 'לימון', 'm', ['food']),
    I('🌶️', 'פלפל חריף', 'm', ['food', 'hot']),
    I('🍬', 'סוכרייה', 'f', ['food']),
    I('🍫', 'שוקולד', 'm', ['food']),
    I('☕', 'קפה חם', 'm', ['hot']),
    I('🍵', 'תה חם', 'm', ['hot']),
    // כלי רכב
    I('🚗', 'מכונית', 'f', ['vehicle', 'ground', 'body', 'faces']),
    I('🚌', 'אוטובוס', 'm', ['vehicle', 'ground', 'body', 'faces']),
    I('🚂', 'רכבת', 'f', ['vehicle', 'ground', 'body', 'faces']),
    I('✈️', 'מטוס', 'm', ['vehicle', 'fly', 'body', 'faces']),
    I('🚲', 'אופניים', 'p', ['vehicle', 'ground', 'body', 'faces']),
    I('🚁', 'מסוק', 'm', ['vehicle', 'fly', 'body', 'faces']),
    I('⛵', 'סירה', 'f', ['vehicle', 'water', 'body', 'faces']),
    I('🚚', 'משאית', 'f', ['vehicle', 'ground', 'body', 'faces']),
    I('🚜', 'טרקטור', 'm', ['vehicle', 'ground', 'body', 'faces']),
    I('🚒', 'כבאית', 'f', ['vehicle', 'ground', 'body', 'faces']),
    I('🚀', 'רקטה', 'f', ['vehicle', 'fly', 'body']),
    I('🛵', 'קטנוע', 'm', ['vehicle', 'ground', 'body', 'faces']),
    // בגדים
    I('👕', 'חולצה', 'f', ['clothes', 'body']),
    I('👖', 'מכנסיים', 'p', ['clothes', 'body']),
    I('👟', 'נעל', 'f', ['clothes', 'body', 'faces']),
    I('🧢', 'כובע', 'm', ['clothes', 'body']),
    I('🧦', 'גרב', 'm', ['clothes', 'body']),
    I('👗', 'שמלה', 'f', ['clothes', 'body']),
    I('🧤', 'כפפה', 'f', ['clothes', 'body']),
    I('🧥', 'מעיל', 'm', ['clothes', 'body']),
    I('🥾', 'מגף', 'm', ['clothes', 'body', 'faces']),
    I('🧣', 'צעיף', 'm', ['clothes']),
    // צעצועים
    I('⚽', 'כדור', 'm', ['toy', 'round', 'body']),
    I('🎈', 'בלון', 'm', ['toy', 'fly', 'body']),
    I('🧩', 'פאזל', 'm', ['toy']),
    I('🎲', 'קובייה', 'f', ['toy', 'angular', 'body']),
    I('🎁', 'מתנה', 'f', ['toy', 'angular', 'body']),
    I('🥁', 'תוף', 'm', ['toy', 'body']),
    I('🧸', 'דובי', 'm', ['toy', 'body', 'teddy']),
    // טבע ושמיים
    I('🌸', 'פרח', 'm', ['nature', 'body']),
    I('🌳', 'עץ', 'm', ['nature', 'ground', 'body']),
    I('☀️', 'שמש', 'f', ['nature', 'sky', 'hot', 'round']),
    I('🌙', 'ירח', 'm', ['nature', 'sky']),
    I('⭐', 'כוכב', 'm', ['nature', 'sky', 'body']),
    I('🌈', 'קשת', 'f', ['nature', 'sky']),
    I('☁️', 'ענן', 'm', ['nature', 'sky', 'body']),
    I('🌵', 'קקטוס', 'm', ['nature', 'ground', 'body']),
    I('🌻', 'חמנייה', 'f', ['nature', 'body']),
    I('❄️', 'פתית שלג', 'm', ['nature', 'cold', 'body']),
    I('⛄', 'איש שלג', 'm', ['cold', 'body']),
    I('🧊', 'קרח', 'm', ['cold', 'angular', 'body']),
    I('🔥', 'אש', 'f', ['hot', 'body']),
    I('🌋', 'הר געש', 'm', ['hot', 'nature', 'body']),
    // חפצים
    I('🔑', 'מפתח', 'm', ['thing', 'body', 'faces']),
    I('☂️', 'מטרייה', 'f', ['thing', 'body']),
    I('🔔', 'פעמון', 'm', ['thing', 'body']),
    I('✂️', 'מספריים', 'p', ['thing', 'body', 'faces']),
    I('🎸', 'גיטרה', 'f', ['thing', 'body', 'faces']),
    I('🔒', 'מנעול', 'm', ['thing', 'angular', 'body']),
    I('🧹', 'מטאטא', 'm', ['thing', 'body', 'faces']),
    I('🛏️', 'מיטה', 'f', ['thing', 'body']),
    I('🚪', 'דלת', 'f', ['thing', 'angular']),
    I('⏰', 'שעון', 'm', ['thing', 'round', 'body']),
    I('🔨', 'פטיש', 'm', ['thing', 'body', 'faces']),
    I('📕', 'ספר', 'm', ['thing', 'angular', 'body']),
    I('📏', 'סרגל', 'm', ['thing', 'angular', 'body']),
    I('🧱', 'לבנה', 'f', ['thing', 'angular']),
    I('✏️', 'עיפרון', 'm', ['thing', 'body', 'faces']),
    I('🕯️', 'נר', 'm', ['thing', 'hot', 'body']),
    I('📦', 'קופסה', 'f', ['thing', 'angular']),
    I('🔵', 'עיגול כחול', 'm', ['round'])
  ];

  const byE = {};
  ITEMS.forEach(it => { byE[it.e] = it; });
  const has = (it, t) => it.tags.includes(t);
  const withTag = t => ITEMS.filter(it => has(it, t));
  const itemOf = e => byE[e] || null;

  const BODY = withTag('body');
  const FACES = withTag('faces');
  /* תמונות "רגילות" ומוכרות - לזיכרון, ל"מה נעלם" ולסדרות */
  const FAMILIAR = ITEMS.filter(it => ['animal', 'food', 'vehicle', 'clothes', 'toy', 'nature'].some(t => has(it, t)) && !has(it, 'teddy'));
  const PATTERN_POOL = ['🍎', '🍌', '⭐', '🌸', '🐟', '🎈', '🐸', '🍓', '⚽', '🌙', '🐥', '🦋', '🍊', '🐢', '🚗', '🍦'].map(itemOf);

  /* ─── צבעים (לסדרות) ─── */
  const DOTS = [
    { key: 'c:red', kind: 'dot', hex: '#ff3b30', n: 'אדום' },
    { key: 'c:blue', kind: 'dot', hex: '#2f7cf6', n: 'כחול' },
    { key: 'c:yellow', kind: 'dot', hex: '#ffd60a', n: 'צהוב' },
    { key: 'c:green', kind: 'dot', hex: '#34c759', n: 'ירוק' },
    { key: 'c:orange', kind: 'dot', hex: '#ff9500', n: 'כתום' },
    { key: 'c:purple', kind: 'dot', hex: '#9b5de5', n: 'סגול' }
  ];

  /* ─── דברים לספירה (יותר/פחות, מתחבאים, חלוקה) ─── */
  /* n יחיד, p רבים, g מין - כדי להגיד "שני תפוחים" ו"שתי עוגיות" נכון */
  const C = (e, n, g, p) => ({ e, n, g, p });
  const COUNT_ITEMS = [
    C('🍎', 'תפוח', 'm', 'תפוחים'), C('🍓', 'תות', 'm', 'תותים'), C('🍪', 'עוגייה', 'f', 'עוגיות'),
    C('🎈', 'בלון', 'm', 'בלונים'), C('⭐', 'כוכב', 'm', 'כוכבים'), C('🐟', 'דג', 'm', 'דגים'),
    C('🌸', 'פרח', 'm', 'פרחים'), C('🍬', 'סוכרייה', 'f', 'סוכריות'), C('🐥', 'אפרוח', 'm', 'אפרוחים'),
    C('⚽', 'כדור', 'm', 'כדורים'), C('🚗', 'מכונית', 'f', 'מכוניות'), C('🦋', 'פרפר', 'm', 'פרפרים'),
    C('🍦', 'גלידה', 'f', 'גלידות')
  ];
  const SHARE_ITEMS = COUNT_ITEMS.filter(c => ['🍬', '🍪', '🍓', '🎈', '🍎'].includes(c.e));

  const NUM_M = ['', 'אחד', 'שניים', 'שלושה', 'ארבעה', 'חמישה', 'שישה', 'שבעה', 'שמונה', 'תשעה', 'עשרה'];
  const NUM_F = ['', 'אחת', 'שתיים', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע', 'עשר'];

  /* "תפוח אחד", "שני תפוחים", "שלוש עוגיות" */
  function countPhrase(n, it) {
    if (n === 1) return `${it.n} ${it.g === 'f' ? 'אחת' : 'אחד'}`;
    if (n === 2) return `${it.g === 'f' ? 'שתי' : 'שני'} ${it.p}`;
    return `${(it.g === 'f' ? NUM_F : NUM_M)[n]} ${it.p}`;
  }

  /* אפשרויות מספריות: התשובה + מסיחים מועדפים, ואם צריך - שכנים */
  function numOptions(answer, { count = 3, min = 1, max = 10, prefer = [] } = {}) {
    const set = new Set([answer]);
    const tryAdd = v => { if (Number.isInteger(v) && v >= min && v <= max && !set.has(v)) set.add(v); };
    prefer.forEach(tryAdd);
    let d = 1;
    while (set.size < count && d < 12) { tryAdd(answer + d); tryAdd(answer - d); d++; }
    return shuffle([...set].slice(0, count));
  }

  /* ─── 1. מי שונה? זוגות דומים (צבע / פרט קטן) ─── */
  /* s יחיד, p רבים - "שלושה תפוחים אדומים ותפוח ירוק אחד" */
  const D = (e, s, p, g) => ({ e, s, p, g });
  const DIFF_PAIRS = [
    [D('🍎', 'תפוח אדום', 'תפוחים אדומים', 'm'), D('🍏', 'תפוח ירוק', 'תפוחים ירוקים', 'm')],
    [D('❤️', 'לב אדום', 'לבבות אדומים', 'm'), D('💙', 'לב כחול', 'לבבות כחולים', 'm')],
    [D('💛', 'לב צהוב', 'לבבות צהובים', 'm'), D('💚', 'לב ירוק', 'לבבות ירוקים', 'm')],
    [D('🙂', 'פרצוף רגיל', 'פרצופים רגילים', 'm'), D('🙃', 'פרצוף הפוך', 'פרצופים הפוכים', 'm')],
    [D('😀', 'פרצוף שמח', 'פרצופים שמחים', 'm'), D('😢', 'פרצוף עצוב', 'פרצופים עצובים', 'm')],
    [D('🌕', 'ירח מלא', 'ירחים מלאים', 'm'), D('🌑', 'ירח חשוך', 'ירחים חשוכים', 'm')],
    [D('🍋', 'לימון', 'לימונים', 'm'), D('🍊', 'תפוז', 'תפוזים', 'm')],
    [D('🌸', 'פרח ורוד', 'פרחים ורודים', 'm'), D('🌼', 'פרח צהוב', 'פרחים צהובים', 'm')],
    [D('🐻', 'דוב', 'דובים', 'm'), D('🐼', 'פנדה', 'פנדות', 'f')],
    [D('🦁', 'אריה', 'אריות', 'm'), D('🐯', 'נמר', 'נמרים', 'm')],
    [D('🐔', 'תרנגולת', 'תרנגולות', 'f'), D('🐓', 'תרנגול', 'תרנגולים', 'm')],
    [D('🐟', 'דג', 'דגים', 'm'), D('🐠', 'דג צבעוני', 'דגים צבעוניים', 'm')],
    [D('🔴', 'עיגול אדום', 'עיגולים אדומים', 'm'), D('🔵', 'עיגול כחול', 'עיגולים כחולים', 'm')],
    [D('⚫', 'עיגול שחור', 'עיגולים שחורים', 'm'), D('⚪', 'עיגול לבן', 'עיגולים לבנים', 'm')],
    [D('🐭', 'עכבר', 'עכברים', 'm'), D('🐹', 'אוגר', 'אוגרים', 'm')],
    [D('🍓', 'תות', 'תותים', 'm'), D('🍒', 'דובדבן', 'דובדבנים', 'm')],
    [D('🐣', 'אפרוח בוקע', 'אפרוחים בוקעים', 'm'), D('🐥', 'אפרוח', 'אפרוחים', 'm')],
    [D('🚗', 'מכונית', 'מכוניות', 'f'), D('🚙', "ג'יפ", "ג'יפים", 'm')],
    [D('🐶', 'כלב', 'כלבים', 'm'), D('🐺', 'זאב', 'זאבים', 'm')]
  ];

  const three = g => (g === 'f' ? 'שלוש' : 'שלושה');
  const oneOf = g => (g === 'f' ? 'אחת' : 'אחד');

  /* ארבע תמונות: שלוש זהות ואחת מזוג "דומה". הערך של כל כפתור כולל את
     המיקום שלו, כי שלושת הזהים חייבים להיות שונים זה מזה בשביל המנוע. */
  function qSpotColor() {
    const pair = draw('diff', DIFF_PAIRS);
    const [maj, odd] = Math.random() < 0.5 ? pair : [pair[1], pair[0]];
    const idx = ri(0, 3);
    const cells = [0, 1, 2, 3].map(i => ({ e: i === idx ? odd.e : maj.e, flip: false }));
    const enc = (c, i) => `${i}:${c.e}:${c.flip ? 1 : 0}`;
    return finish({
      kind: 'pick', type: 'spotDiff', variant: 'color', key: `sd:${maj.e}${odd.e}:${idx}`, optStyle: 'cells',
      prompt: 'מי שונה מכולם?',
      speech: 'ארבע תמונות: שלוש בדיוק אותו דבר, ואחת קצת שונה. תסתכל טוב טוב, ומצא את השונה!',
      hint: 'תסתכל על הצבע ועל הפרטים הקטנים. שלוש זהות לגמרי - ואחת לא.',
      revealSpeech: `${three(maj.g)} ${maj.p}, ו${odd.s} ${oneOf(odd.g)}! לחץ ${on(odd.g)}.`,
      answer: enc(cells[idx], idx), options: cells.map(enc), visual: LISTEN, cells, oddIdx: idx
    });
  }

  /* ארבע תמונות זהות, אחת מסתכלת לצד השני (הפוכה ב-CSS) */
  function qSpotMirror() {
    const it = draw('mirror', FACES);
    const idx = ri(0, 3);
    const cells = [0, 1, 2, 3].map(i => ({ e: it.e, flip: i === idx }));
    const enc = (c, i) => `${i}:${c.e}:${c.flip ? 1 : 0}`;
    const rev = it.g === 'f' ? 'ההפוכה' : 'ההפוך';
    return finish({
      kind: 'pick', type: 'spotDiff', variant: 'mirror', key: `sm:${it.e}:${idx}`, optStyle: 'cells',
      prompt: 'מי מסתכל לצד השני?',
      speech: `ארבע תמונות של ${it.n}. שלוש מסתכלות לאותו צד, ואחת התהפכה ומסתכלת לצד השני! מצא אותה.`,
      hint: 'תסתכל לאן כל אחד מסתכל. שלוש פונות לצד אחד, ואחת לצד השני.',
      revealSpeech: `כולם מסתכלים לאותו צד, חוץ מאחד שהתהפך! לחץ על ה${it.n} ${rev}.`,
      answer: enc(cells[idx], idx), options: cells.map(enc), visual: LISTEN, cells, oddIdx: idx, item: it
    });
  }

  /* ─── 2. של מי הצל? ─── */
  function qShadow() {
    const it = draw('shadow', BODY);
    const sameCat = BODY.filter(x => x !== it && x.tags[0] === it.tags[0]);
    const others = take(sameCat.length >= 2 ? sameCat : BODY, 2, [it]);
    const opts = shuffle([it, ...others]);
    return finish({
      kind: 'pick', type: 'shadow', key: `sh:${it.e}:${others.map(x => x.e).join('')}`, optStyle: 'emoji',
      prompt: 'של מי הצל?',
      speech: `זה צל שחור. של מי הצל הזה? ${namesOf(opts)}. תסתכל על הצורה!`,
      hint: 'תסתכל טוב על הקווים של הצל, והשווה לכל תמונה. למי יש בדיוק אותה צורה?',
      revealSpeech: `זה הצל של ה${it.n}! לחץ על ה${it.n}.`,
      answer: it.e, options: opts.map(x => x.e), visual: { type: 'shadow', e: it.e }, item: it, items: opts
    });
  }

  /* ─── 3 / 18. זיכרון ─── */
  function qMemory(nPairs) {
    const first = draw('memFirst', FAMILIAR);
    const items = [first, ...take(FAMILIAR, nPairs - 1, [first])];
    const cards = shuffle([...items, ...items]);
    return finish({
      kind: 'build', type: 'memory', key: `mem:${items.map(x => x.e).sort().join('')}`,
      prompt: `מצא את הזוגות! ${nPairs} זוגות`,
      speech: `משחק זיכרון! הפוך שני כרטיסים. אם יש בהם אותה תמונה - זה זוג, והם נשארים פתוחים. אם לא - הם נסגרים, אז תזכור איפה כל תמונה. יש ${nPairs} זוגות.`,
      hint: 'תזכור איפה ראית כל תמונה. הפוך כרטיס, ותחשוב: איפה ראיתי את זה קודם?',
      revealSpeech: '',
      answer: items.map(x => x.e).sort().join(''), options: [],
      memory: { cards: cards.map(x => x.e), pairs: nPairs }, visual: null, items
    });
  }

  /* ─── 4 / 19. מה נעלם? ─── */
  /* מציגים n תמונות, אחת נעלמת, ובוחרים מבין optCount: הנעלמת + תמונות שלא היו */
  function qVanish(n, optCount) {
    const first = draw('vanFirst', FAMILIAR);
    const shown = shuffle([first, ...take(FAMILIAR, n - 1, [first])]);
    const gone = pick(shown);
    const others = take(FAMILIAR, optCount - 1, shown);
    const opts = shuffle([gone, ...others]);
    return finish({
      kind: 'build', type: 'vanish', key: `vn:${shown.map(x => x.e).join('')}:${gone.e}`,
      prompt: 'מה נעלם?',
      speech: `תסתכל טוב על ${n === 4 ? 'ארבע' : 'שש'} התמונות: ${namesOf(shown)}. תזכור אותן! עוד רגע אחת תיעלם.`,
      afterSpeech: `אחת נעלמה! מה נעלם? ${namesOf(opts)}.`,
      hint: `תסתכל על התמונות שנשארו, ותחשוב מה היה שם קודם ועכשיו אין. ${namesOf(opts)}?`,
      revealSpeech: `${thisIs(gone.g)} ${gone.n} ${gone.g === 'f' ? 'נעלמה' : 'נעלם'}! לחץ על ה${gone.n}.`,
      answer: gone.e, options: opts.map(x => x.e),
      vanish: { shown: shown.map(x => x.e), gone: gone.e, lookMs: n === 4 ? 4500 : 6000 },
      visual: null, items: shown, gone, choices: opts
    });
  }

  /* ─── 5. סדר לפי גודל ─── */
  const SIZES = { 3: ['s', 'm', 'l'], 4: ['xs', 's', 'm', 'l'] };
  function qOrder(n, dir) {
    const it = draw('order', BODY);
    const asc = SIZES[n];
    const expected = dir === 'asc' ? asc : asc.slice().reverse();
    let tiles = shuffle(asc);
    let guard = 0;
    while (tiles.join() === expected.join() && guard++ < 10) tiles = shuffle(asc);
    const big = it.g === 'f' ? 'גדולה' : 'גדול', small = it.g === 'f' ? 'קטנה' : 'קטן';
    const speech = dir === 'asc'
      ? `יש ${it.n} ב${n === 3 ? 'שלושה' : 'ארבעה'} גדלים. סדר מהקטן לגדול: לחץ קודם על ה${it.n} הכי ${small}, אחר כך על ה${big} יותר, וככה עד הכי ${big}.`
      : `יש ${it.n} ב${n === 3 ? 'שלושה' : 'ארבעה'} גדלים. הפעם הפוך - מהגדול לקטן: לחץ קודם על ה${it.n} הכי ${big}, אחר כך על ה${small} יותר, וככה עד הכי ${small}.`;
    return finish({
      kind: 'build', type: 'order', dir, key: `ord:${it.e}:${n}:${dir}:${tiles.join('')}`,
      prompt: dir === 'asc' ? 'סדר מהקטן לגדול' : 'סדר מהגדול לקטן',
      speech,
      hint: dir === 'asc' ? 'תמצא את הכי קטן. אחריו - את הקטן הבא בתור.' : 'תמצא את הכי גדול. אחריו - את הגדול הבא בתור.',
      revealSpeech: '',
      answer: expected.join(','), options: [],
      order: { tiles, expected }, visual: null, item: it
    });
  }

  /* ─── 6. מי לא שייך? ─── */
  /* members - מי בקבוצה; oddTags - מאיפה מגיע "הלא שייך"; never - מי לעולם לא יהיה
     הלא-שייך (למשל דובי מול חיות, או נר מול דברים חמים) */
  const CATS = [
    { key: 'animal', yes: 'הם חיות', members: it => has(it, 'animal'), oddTags: ['food', 'vehicle', 'clothes', 'toy', 'thing'], never: ['teddy'] },
    { key: 'food', yes: 'הם אוכל', members: it => has(it, 'food'), oddTags: ['vehicle', 'clothes', 'toy', 'thing'], never: ['hot'] },
    { key: 'vehicle', yes: 'הם כלי רכב שנוסעים', members: it => has(it, 'vehicle'), oddTags: ['animal', 'food', 'clothes', 'toy', 'thing'], never: [] },
    { key: 'clothes', yes: 'הם בגדים שלובשים', members: it => has(it, 'clothes'), oddTags: ['animal', 'food', 'vehicle', 'toy', 'thing'], never: [] },
    { key: 'toy', yes: 'הם צעצועים', members: it => has(it, 'toy'), oddTags: ['animal', 'food', 'vehicle', 'clothes'], never: [] },
    { key: 'fly', yes: 'עפים בשמיים', members: it => has(it, 'fly'), oddTags: ['ground', 'water'], never: [] },
    { key: 'water', yes: 'גרים במים', members: it => has(it, 'water') && has(it, 'animal'), oddTags: ['ground', 'fly'], never: ['water'] },
    { key: 'hot', yes: 'חמים', members: it => has(it, 'hot'), oddTags: ['cold', 'thing', 'clothes'], never: ['hot'] },
    { key: 'cold', yes: 'קרים', members: it => has(it, 'cold'), oddTags: ['hot', 'thing', 'clothes'], never: ['cold'] },
    { key: 'sky', yes: 'נמצאים בשמיים', members: it => has(it, 'sky'), oddTags: ['ground', 'thing', 'food', 'clothes'], never: ['fly', 'sky'] },
    { key: 'round', yes: 'עגולים', members: it => has(it, 'round'), oddTags: ['angular'], never: ['round'] }
  ];
  CATS.forEach(c => {
    c.items = ITEMS.filter(c.members);
    c.odds = ITEMS.filter(it => !c.members(it) && c.oddTags.some(t => has(it, t)) && !c.never.some(t => has(it, t)));
  });

  function qOdd(cat) {
    const group = take(cat.items, 3);
    const odd = draw('odd:' + cat.key, cat.odds);
    const opts = shuffle([...group, odd]);
    return finish({
      kind: 'pick', type: 'odd', cat: cat.key, key: `odd:${group.map(x => x.e).join('')}:${odd.e}`, optStyle: 'emoji',
      prompt: 'מי לא שייך?',
      speech: `מי לא שייך? ${namesOf(opts)}. שלוש תמונות הולכות ביחד, ואחת לא!`,
      hint: `תחשוב מה משותף: ${heList(group.map(x => x.n))} ${cat.yes}. ומי לא?`,
      revealSpeech: `${heList(group.map(x => x.n))} ${cat.yes}, אבל ${odd.n} - לא! לחץ על ה${odd.n}.`,
      answer: odd.e, options: opts.map(x => x.e), visual: LISTEN, items: opts, group, odd
    });
  }

  /* ─── 7. מה הולך ביחד? ─── */
  /* grp - זוגות מאותה קבוצה לא ישמשו מסיחים זה לזה (ארנב-גזר מול קוף-בננה) */
  const N = (e, n) => ({ e, n });
  const PAIRS = [
    { a: N('🧦', 'גרב'), b: N('👟', 'נעל'), why: 'גרב ונעל הולכים ביחד על הרגל', grp: 'wear' },
    { a: N('🧤', 'כפפה'), b: N('✋', 'יד'), why: 'את הכפפה שמים על היד', grp: 'wear' },
    { a: N('🧢', 'כובע'), b: N('☀️', 'שמש'), why: 'הכובע שומר על הראש מהשמש', grp: 'weather' },
    { a: N('☔', 'מטרייה'), b: N('🌧️', 'גשם'), why: 'המטרייה שומרת עלינו מהגשם', grp: 'weather' },
    { a: N('⛄', 'איש שלג'), b: N('❄️', 'שלג'), why: 'איש שלג בונים משלג', grp: 'weather' },
    { a: N('🔑', 'מפתח'), b: N('🔒', 'מנעול'), why: 'המפתח פותח את המנעול', grp: 'tool' },
    { a: N('✏️', 'עיפרון'), b: N('📄', 'דף'), why: 'עם עיפרון מציירים על דף', grp: 'tool' },
    { a: N('🧼', 'סבון'), b: N('🛁', 'אמבטיה'), why: 'עם סבון מתרחצים באמבטיה', grp: 'tool' },
    { a: N('🐝', 'דבורה'), b: N('🍯', 'דבש'), why: 'הדבורה מכינה דבש', grp: 'animal' },
    { a: N('🐔', 'תרנגולת'), b: N('🥚', 'ביצה'), why: 'התרנגולת מטילה ביצה', grp: 'animal' },
    { a: N('🐄', 'פרה'), b: N('🥛', 'חלב'), why: 'החלב בא מהפרה', grp: 'animal' },
    { a: N('🐰', 'ארנב'), b: N('🥕', 'גזר'), why: 'הארנב אוהב לאכול גזר', grp: 'animal' },
    { a: N('🐵', 'קוף'), b: N('🍌', 'בננה'), why: 'הקוף אוהב לאכול בננה', grp: 'animal' },
    { a: N('🐶', 'כלב'), b: N('🦴', 'עצם'), why: 'הכלב אוהב עצם', grp: 'animal' },
    { a: N('🐟', 'דג'), b: N('🌊', 'ים'), why: 'הדג שוחה בים', grp: 'animal' },
    { a: N('🐦', 'ציפור'), b: N('🌳', 'עץ'), why: 'הציפור גרה על העץ', grp: 'animal' },
    { a: N('🛏️', 'מיטה'), b: N('🌙', 'ירח'), why: 'בלילה, כשהירח בשמיים, ישנים במיטה', grp: 'home' },
    { a: N('🎂', 'עוגה'), b: N('🕯️', 'נר'), why: 'על עוגת יום הולדת שמים נר', grp: 'party' },
    { a: N('🚗', 'מכונית'), b: N('⛽', 'תחנת דלק'), why: 'המכונית ממלאת דלק בתחנת הדלק', grp: 'car' }
  ];

  function qPair(optCount = 4) {
    const p = draw('pair', PAIRS);
    const others = take(PAIRS.filter(x => x !== p && x.grp !== p.grp), optCount - 1).map(x => x.b);
    const opts = shuffle([p.b, ...others]);
    return finish({
      kind: 'pick', type: 'pair', key: `pr:${p.a.e}:${others.map(x => x.e).join('')}`, optStyle: 'emoji',
      prompt: `מה הולך ביחד עם ה${p.a.n}?`,
      speech: `הנה ${p.a.n}. מה הולך ביחד עם ה${p.a.n}? ${namesOf(opts)}.`,
      hint: `תחשוב: מה עושים עם ${p.a.n}? עם מי הוא נפגש?`,
      revealSpeech: `${p.why}! לחץ על ה${p.b.n}.`,
      answer: p.b.e, options: opts.map(x => x.e), visual: { type: 'emoji', e: p.a.e }, pair: p, items: opts
    });
  }

  /* ─── 8. הפכים ─── */
  /* adj - המילה (ומפתח ייחודי), n - שם התמונה להקראה, e אמוג'י או css ציור */
  const OPPOSITES = [
    [{ e: '🔥', adj: 'חם', n: 'האש' }, { e: '🧊', adj: 'קר', n: 'הקרח' }],
    [{ e: '☀️', adj: 'יום', n: 'השמש' }, { e: '🌙', adj: 'לילה', n: 'הירח' }],
    [{ e: '🐘', adj: 'גדול', n: 'הפיל' }, { e: '🐭', adj: 'קטן', n: 'העכבר' }],
    [{ e: '🐇', adj: 'מהיר', n: 'הארנב' }, { e: '🐢', adj: 'איטי', n: 'הצב' }],
    [{ e: '😀', adj: 'שמח', n: 'הפרצוף השמח' }, { e: '😢', adj: 'עצוב', n: 'הפרצוף העצוב' }],
    [{ e: '⬆️', adj: 'למעלה', n: 'החץ למעלה' }, { e: '⬇️', adj: 'למטה', n: 'החץ למטה' }],
    [{ e: '📖', adj: 'פתוח', n: 'הספר הפתוח' }, { e: '📕', adj: 'סגור', n: 'הספר הסגור' }],
    [{ e: '🧱', adj: 'כבד', n: 'הלבנה' }, { e: '🎈', adj: 'קל', n: 'הבלון' }],
    [{ css: 'glass-full', adj: 'מלא', n: 'הכוס המלאה' }, { css: 'glass-empty', adj: 'ריק', n: 'הכוס הריקה' }],
    [{ e: '🍬', adj: 'מתוק', n: 'הסוכרייה' }, { e: '🍋', adj: 'חמוץ', n: 'הלימון' }],
    [{ e: '🌳', adj: 'גבוה', n: 'העץ הגבוה' }, { e: '🌱', adj: 'נמוך', n: 'הנבט הנמוך' }],
    [{ e: '📢', adj: 'רועש', n: 'הרמקול' }, { e: '🤫', adj: 'שקט', n: 'הילד השקט' }]
  ];
  const OPP_SIDES = OPPOSITES.flat();

  function qOpposite() {
    const pair = draw('opp', OPPOSITES);
    const [a, b] = Math.random() < 0.5 ? pair : [pair[1], pair[0]];
    const others = take(OPP_SIDES.filter(s => s !== a && s !== b), 2);
    const opts = shuffle([b, ...others]);
    const sides = {};
    opts.forEach(s => { sides[s.adj] = s; });
    return finish({
      kind: 'pick', type: 'opposite', key: `op:${a.adj}:${others.map(x => x.adj).join(',')}`, optStyle: 'opp',
      prompt: `מה ההפך מ${a.adj}?`,
      speech: `${a.adj}. מה ההפך מ${a.adj}? ${opts.map(x => x.adj).join(', ')}.`,
      hint: `${a.n} ${a.adj}. תחשוב מה בדיוק להפך.`,
      revealSpeech: `ההפך מ${a.adj} זה ${b.adj}! לחץ על ${b.n}.`,
      answer: b.adj, options: opts.map(x => x.adj), visual: a.e ? { type: 'emoji', e: a.e } : { type: 'css', css: a.css },
      from: a, to: b, sides
    });
  }

  /* ─── 9 / 16. סדרות ─── */
  /* unit - התבנית (AB, AAB, ABC...), len - כמה פריטים מוצגים, hole - החור באמצע ולא בסוף */
  function qPattern({ unit, len, optCount = 3, hole = false }) {
    const useDots = Math.random() < 0.4;
    const letters = [...new Set(unit)];
    const need = Math.max(letters.length, optCount);
    const asItem = it => ({ key: 'e:' + it.e, kind: 'emoji', e: it.e, n: it.n });
    const first = useDots ? draw('patDot', DOTS) : asItem(draw('patEmoji', PATTERN_POOL));
    const items = useDots ? [first, ...take(DOTS, need - 1, [first])]
      : [first, ...take(PATTERN_POOL, need - 1, [itemOf(first.e)]).map(asItem)];
    const map = {};
    letters.forEach((L, i) => { map[L] = items[i]; });
    const full = [];
    for (let i = 0; i <= len; i++) full.push(map[unit[i % unit.length]]);
    const missIdx = hole ? ri(1, len - 1) : len;
    const answer = full[missIdx];
    const seq = full.map((x, i) => (i === missIdx ? null : x));
    const opts = shuffle(items.slice(0, optCount));
    const byKey = {};
    items.forEach(x => { byKey[x.key] = x; });
    const read = seq.map(x => (x ? x.n : 'מה?')).join(', ');
    return finish({
      kind: 'pick', type: 'pattern', unit, key: `pat:${unit}:${len}:${missIdx}:${items.map(x => x.key).join(',')}`, optStyle: 'pattern',
      prompt: hole ? 'מה חסר בסדרה?' : 'מה בא אחר כך?',
      speech: `${hole ? 'מה חסר בסדרה?' : 'מה בא אחר כך?'} תסתכל: ${read}`,
      hint: `תגיד את הסדרה בקול, לאט: ${read}. היא חוזרת על עצמה שוב ושוב!`,
      revealSpeech: `${read.replace('מה?', answer.n)}! במקום החסר בא ${answer.n}. לחץ על ה${answer.n}.`,
      answer: answer.key, options: opts.map(x => x.key),
      visual: { type: 'pattern', seq, missIdx }, items: byKey, pattern: { unit, len, missIdx, full }
    });
  }

  /* ─── 10. חידות ─── */
  /* pool - מסיחים בטוחים (שהחידה לא מתאימה להם) */
  const R = (e, text, pool) => ({ e, text, pool });
  const RIDDLES = [
    R('🐰', 'יש לי אוזניים ארוכות, אני קופץ, ואוהב לאכול גזר. מי אני?', ['🐢', '🐘', '🐟', '🐮', '🐍']),
    R('🐘', 'אני ענק ואפור, ויש לי חדק ארוך. מי אני?', ['🐰', '🐱', '🐥', '🐟', '🐝']),
    R('🦒', 'יש לי צוואר ארוך ארוך, ואני אוכלת עלים מהעצים הגבוהים. מי אני?', ['🐷', '🐢', '🐟', '🐭', '🦀']),
    R('🐮', 'אני אומרת מו, ונותנת חלב. מי אני?', ['🐱', '🐸', '🦋', '🐍', '🐧']),
    R('🐶', 'אני נובח, מכשכש בזנב, ואוהב לשחק עם ילדים. מי אני?', ['🐟', '🐢', '🐝', '🐮', '🐘']),
    R('🐱', 'אני אומר מיאו, ואוהב לישון בשמש. מי אני?', ['🐮', '🐸', '🐟', '🐘', '🦆']),
    R('🐸', 'אני ירוקה, קופצת, ואומרת קווה קווה. מי אני?', ['🐱', '🐶', '🐘', '🐑', '🐫']),
    R('🐟', 'אני שוחה במים כל היום, ויש לי סנפירים. מי אני?', ['🐶', '🐱', '🐘', '🦒', '🐎']),
    R('🐝', 'אני קטנה, מזמזמת, ומכינה דבש. מי אני?', ['🐘', '🐢', '🐟', '🐎', '🐫']),
    R('🦋', 'יש לי כנפיים צבעוניות, ופעם הייתי זחל. מי אני?', ['🐢', '🐟', '🐘', '🐍', '🐷']),
    R('🐢', 'אני הולך לאט לאט, ויש לי בית על הגב. מי אני?', ['🐶', '🐎', '🦋', '🐦', '🐭']),
    R('🐧', 'אני ציפור בשחור ולבן. אני לא עפה, אבל שוחה מצוין בקור. מי אני?', ['🐘', '🦒', '🐫', '🐷', '🐰']),
    R('🦁', 'אני מלך החיות, ויש לי רעמה גדולה. מי אני?', ['🐭', '🐥', '🐟', '🐢', '🐸']),
    R('🐵', 'אני מטפס על עצים, ואוהב בננות. מי אני?', ['🐟', '🐢', '🐮', '🐑', '🐊']),
    R('🍌', 'אני צהובה וארוכה, וקופים אוהבים אותי. מה אני?', ['🍎', '🥕', '🍕', '🍪', '🧀']),
    R('🍎', 'אני עגול ואדום, גדל על עץ, ובריא לאכול אותי. מה אני?', ['🍌', '🥕', '🍞', '🧀', '🍕']),
    R('🥕', 'אני כתום וארוך, גדל באדמה, וארנבים אוהבים אותי. מה אני?', ['🍎', '🍌', '🍞', '🍕', '🧀']),
    R('🍕', 'אני עגולה, עם גבינה ורוטב, ומחלקים אותי למשולשים. מה אני?', ['🍎', '🍌', '🥕', '🍦', '🥚']),
    R('🍦', 'אני קרה ומתוקה, ונמסה בשמש. מה אני?', ['🍞', '🥕', '🍕', '🧀', '🥚']),
    R('🚗', 'יש לי ארבעה גלגלים, ואני נוסעת בכביש. מה אני?', ['✈️', '⛵', '🚲', '🚁', '🚀']),
    R('✈️', 'אני טס גבוה בשמיים, ולוקח אנשים למקומות רחוקים. מה אני?', ['🚗', '🚂', '⛵', '🚲', '🚜']),
    R('🚂', 'אני ארוכה, נוסעת על פסים, ועושה טו טו. מה אני?', ['🚗', '⛵', '🚲', '✈️', '🚁']),
    R('⛵', 'אני שטה על המים, ויש לי מפרש. מה אני?', ['🚗', '🚂', '🚲', '🚜', '🚌']),
    R('🚲', 'יש לי שני גלגלים, ורוכבים עליי עם הרגליים. מה אני?', ['🚗', '🚂', '⛵', '✈️', '🚌']),
    R('☀️', 'אני עגולה וחמה, ומאירה ביום. מה אני?', ['🌙', '☁️', '🌈', '🌳', '🌸']),
    R('🌙', 'אני מאיר בלילה. לפעמים אני עגול ולפעמים דק. מה אני?', ['☀️', '☁️', '🌈', '🌳', '🌸']),
    R('☂️', 'פותחים אותי כשיורד גשם, כדי לא להתרטב. מה אני?', ['🔑', '👟', '⚽', '🧢', '🛏️']),
    R('👟', 'שמים אותי על הרגליים לפני שיוצאים לגן. מה אני?', ['🧢', '🧤', '🔑', '⚽', '☂️']),
    R('🧢', 'שמים אותי על הראש כשהשמש חזקה. מה אני?', ['👟', '🧦', '🔑', '⚽', '☂️']),
    R('🔑', 'אני קטן, ואיתי פותחים את הדלת. מה אני?', ['⚽', '👟', '🧢', '🛏️', '☂️']),
    R('⚽', 'אני עגול, ובועטים בי ברגל. מה אני?', ['🔑', '👟', '🎁', '🎲', '🥁']),
    R('🛏️', 'ישנים עליי בלילה, עם כרית ושמיכה. מה אני?', ['🔑', '⚽', '☂️', '🚪', '⏰']),
    R('🎂', 'אוכלים אותי ביום הולדת, אחרי שמכבים את הנרות. מה אני?', ['🍞', '🥕', '🧀', '🥚', '🍋']),
    R('🌈', 'אני מופיעה בשמיים אחרי הגשם, בהרבה צבעים. מה אני?', ['☀️', '🌙', '🌳', '🌸', '☁️']),
    R('⛄', 'בונים אותי משלג, עם אף מגזר. מה אני?', ['🌳', '🌸', '⚽', '🔑', '🛏️'])
  ];

  function qRiddle() {
    const r = draw('riddle', RIDDLES);
    const it = itemOf(r.e);
    const others = shuffle(r.pool).slice(0, 2).map(itemOf);
    const opts = shuffle([it, ...others]);
    return finish({
      kind: 'pick', type: 'riddle', key: `rd:${r.e}:${others.map(x => x.e).join('')}`, optStyle: 'emoji',
      prompt: r.text,
      speech: `חידה! ${r.text} ${namesOf(opts)}.`,
      hint: `תקשיב שוב לרמזים: ${r.text}`,
      revealSpeech: `${thisIs(it.g)} ${it.n}! לחץ ${on(it.g)}.`,
      answer: it.e, options: opts.map(x => x.e), visual: { type: 'listen', e: '🤔' }, item: it, items: opts, riddle: r,
      replayRate: 0.8
    });
  }

  /* ─── 11. איפה החתול? ─── */
  const POS_ANIMALS = ['🐱', '🐶', '🐰', '🐻', '🐸', '🐥'].map(itemOf);
  const PROPS = [
    { key: 'table', n: 'שולחן', pos: ['on', 'under', 'next'] },
    { key: 'box', n: 'קופסה', pos: ['in', 'on', 'next'] }
  ];
  const POS_PHRASE = {
    on: p => `על ה${p}`, under: p => `מתחת ל${p}`, next: p => `ליד ה${p}`, in: p => `בתוך ה${p}`
  };

  function qPosition() {
    const an = draw('posA', POS_ANIMALS);
    const prop = draw('posP', PROPS);
    const pos = draw('pos:' + prop.key, prop.pos);
    const phrase = POS_PHRASE[pos](prop.n);
    return finish({
      kind: 'pick', type: 'position', pos, key: `pos:${an.e}:${prop.key}:${pos}`, optStyle: 'scene',
      prompt: `איפה ה${an.n} ${phrase}?`,
      speech: `לחץ על התמונה שבה ה${an.n} ${phrase}!`,
      hint: `תסתכל בכל תמונה איפה ה${an.n} נמצא${an.g === 'f' ? 'ת' : ''}: למעלה, למטה, בצד או בפנים. איפה ${an.g === 'f' ? 'היא' : 'הוא'} ${phrase}?`,
      revealSpeech: `כאן ה${an.n} ${phrase}! לחץ על התמונה הזאת.`,
      answer: pos, options: shuffle(prop.pos), visual: LISTEN, scene: { prop: prop.key, propName: prop.n, e: an.e }, animal: an
    });
  }

  /* ─── 12. מה קורה קודם? ─── */
  const S = (e, n, g) => ({ e, n, g });
  const STORIES = [
    [S('🥚', 'ביצה', 'f'), S('🐣', 'אפרוח בוקע', 'm'), S('🐔', 'תרנגולת', 'f')],
    [S('🌱', 'נבט קטן', 'm'), S('🌿', 'צמח', 'm'), S('🌳', 'עץ גדול', 'm')],
    [S('👶', 'תינוק', 'm'), S('🧒', 'ילד', 'm'), S('🧑', 'איש גדול', 'm')],
    [S('☁️', 'ענן', 'm'), S('🌧️', 'גשם', 'm'), S('🌈', 'קשת', 'f')],
    [S('🌅', 'בוקר', 'm'), S('☀️', 'צהריים', 'm'), S('🌙', 'לילה', 'm')],
    [S('🛒', 'קונים אוכל', 'p'), S('🍳', 'מבשלים', 'p'), S('🍽️', 'אוכלים', 'p')],
    [S('🛁', 'אמבטיה', 'f'), S('🛏️', 'מיטה', 'f'), S('😴', 'שינה', 'f')],
    [S('🐛', 'זחל', 'm'), S('🦋', 'פרפר', 'm')],
    [S('🧦', 'גרב', 'm'), S('👟', 'נעל', 'f')],
    [S('🧊', 'קרח', 'm'), S('💧', 'מים', 'p')]
  ];

  function qStory() {
    const idx = draw('story', STORIES.map((_, i) => i));
    const steps = STORIES[idx];
    const order = arr => arr.map(x => x.e).join('');
    let tiles = shuffle(steps);
    let guard = 0;
    while (order(tiles) === order(steps) && guard++ < 20) tiles = shuffle(steps);
    return finish({
      kind: 'build', type: 'story', key: `st:${idx}:${tiles.map(x => x.e).join('')}`,
      prompt: 'מה קורה קודם? סדר לפי הסדר',
      speech: `מה קורה קודם? יש פה ${namesOf(tiles)}. לחץ קודם על מה שקורה ראשון, ואחר כך על מה שבא אחריו.`,
      hint: `תחשוב מה קורה בהתחלה, ומה קורה בסוף. ${namesOf(steps)} - זה הסדר.`,
      revealSpeech: '',
      answer: steps.map(x => x.e).join(''), options: [],
      story: { steps, tiles }, visual: null, doneSpeech: steps.map(x => x.n).join(', ואז ') + '!'
    });
  }

  /* ─── 13. איפה יש יותר? ─── */
  function qCompare(mode) {
    const it = draw('cmp', COUNT_ITEMS);
    const a = ri(1, 10);
    let b = ri(1, 10);
    while (b === a) b = ri(1, 10);
    const answer = mode === 'more' ? Math.max(a, b) : Math.min(a, b);
    const word = mode === 'more' ? 'יותר' : 'פחות';
    return finish({
      kind: 'pick', type: 'compare', mode, key: `cmp:${it.e}:${a}:${b}:${mode}`, optStyle: 'qty',
      prompt: `איפה יש ${word} ${it.p}?`,
      speech: `בשני הכרטיסים יש ${it.p}. לחץ על הכרטיס שיש בו ${word}! תקשיב טוב: ${word}.`,
      hint: `תסתכל איפה יש הרבה ואיפה מעט. אפשר גם לספור בכל כרטיס. איפה יש ${word}?`,
      revealSpeech: `בכרטיס הזה יש ${countPhrase(answer, it)} - זה ${word}! לחץ עליו.`,
      answer, options: shuffle([a, b]), visual: LISTEN, item: it, counts: [a, b]
    });
  }

  /* ─── 14. לפני ואחרי ─── */
  function qBeforeAfter(mode) {
    const n = draw('ba:' + mode, mode === 'after' ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const answer = mode === 'after' ? n + 1 : n - 1;
    const other = mode === 'after' ? n - 1 : n + 1;
    const options = numOptions(answer, { count: 3, min: 1, max: 10, prefer: [other, n] });
    return finish({
      kind: 'pick', type: 'beforeAfter', mode, key: `ba:${n}:${mode}`, optStyle: 'num',
      prompt: mode === 'after' ? `מה בא אחרי ${n}?` : `מה בא לפני ${n}?`,
      speech: mode === 'after' ? `המספרים צועדים בסדר. מה המספר שבא אחרי ${n}?` : `המספרים צועדים בסדר. מה המספר שבא לפני ${n}?`,
      hint: mode === 'after' ? `ספור בקול מ-1, ותעצור אחרי ${n}. איזה מספר אמרת אחר כך?` : `ספור בקול מ-1 עד ${n}. איזה מספר אמרת ממש לפני ${n}?`,
      revealSpeech: mode === 'after' ? `אחרי ${n} בא ${answer}! לחץ על ${answer}.` : `לפני ${n} בא ${answer}! לחץ על ${answer}.`,
      answer, options, visual: { type: 'numArrow', n, mode }, n
    });
  }

  /* ─── 15. כמה מתחבאים? ─── */
  function qHidden() {
    const it = draw('hide', COUNT_ITEMS);
    const total = ri(3, 6);
    const k = ri(1, Math.min(3, total - 1));
    const visible = total - k;
    return finish({
      kind: 'pick', type: 'hidden', key: `hd:${it.e}:${total}:${k}`, optStyle: 'num',
      prompt: 'כמה מתחבאים בקופסה?',
      speech: `יש ${countPhrase(total, it)}. אופס! כמה מהם נכנסו לקופסה ומתחבאים. ספור כמה נשארו בחוץ, ותחשוב: כמה יש בקופסה?`,
      hint: `היו ${total}. ספור כמה נשארו בחוץ, ותחשוב כמה חסרים עד ${total}. אלה שחסרים - בקופסה!`,
      revealSpeech: `היו ${total}. בחוץ נשארו ${visible}, אז בקופסה מתחבאים ${k}! לחץ על ${k}.`,
      answer: k, options: numOptions(k, { count: 3, min: 1, max: 10, prefer: [visible, total] }),
      visual: { type: 'hidden', emoji: it.e, total, k }, item: it, total, k
    });
  }

  /* ─── 17. חלוקה שווה ─── */
  const KIDS = [{ e: '👧', n: 'ילדה' }, { e: '👦', n: 'ילד' }, { e: '🧒', n: 'ילד' }];
  function qShare() {
    const kids = pick([2, 2, 3]);
    const each = ri(1, kids === 2 ? 4 : 3);
    const total = kids * each;
    const it = draw('share', SHARE_ITEMS);
    const kidsHe = kids === 2 ? 'שני ילדים' : 'שלושה ילדים';
    return finish({
      kind: 'pick', type: 'share', key: `shr:${it.e}:${kids}:${each}`, optStyle: 'num',
      prompt: `${countPhrase(total, it)} ל${kidsHe}. כמה מקבל כל ילד?`,
      speech: `יש ${countPhrase(total, it)} ו${kidsHe}. מחלקים שווה בשווה: כל ילד מקבל אותו מספר. כמה ${it.p} מקבל כל ילד?`,
      hint: `תן ${it.n} ${it.g === 'f' ? 'אחת' : 'אחד'} לכל ילד, ושוב ${it.g === 'f' ? 'אחת' : 'אחד'} לכל ילד, עד שנגמרים. ספור כמה קיבל ילד אחד.`,
      revealSpeech: `${countPhrase(total, it)} ל${kidsHe}: כל ילד מקבל ${each}! לחץ על ${each}.`,
      answer: each, options: numOptions(each, { count: 3, min: 1, max: 12, prefer: [total, kids] }),
      visual: { type: 'share', emoji: it.e, kids: KIDS.slice(0, kids).map(k => k.e), total, each }, item: it, kids, total, each
    });
  }

  /* ברירות מחדל לכל תרגיל */
  function finish(q) {
    if (!q.replayRate) q.replayRate = 0.85;
    return q;
  }

  /* ─── הרמות ─── */
  const HARD_UNITS = ['AAB', 'ABB', 'ABC', 'AABB'];

  const LEVELS = [
    {
      id: 1, name: 'מי שונה?', icon: '🔍',
      explain: 'בוא נשחק בבלשים! ארבע תמונות: שלוש בדיוק אותו דבר, ואחת קצת שונה - בצבע, בפרט קטן, או שהיא מסתכלת לצד השני. תסתכל טוב טוב, ומצא את השונה!',
      demoSpec: { type: 'spotDemo', cells: ['🍎', '🍎', '🍏', '🍎'], oddIdx: 2, say: 'שלושה תפוחים אדומים ותפוח ירוק אחד. הירוק שונה!' },
      gen: () => mix([[3, qSpotColor], [2, qSpotMirror]])
    },
    {
      id: 2, name: 'של מי הצל?', icon: '🌑',
      explain: 'לכל דבר יש צל! הצל שחור, אבל הצורה שלו מגלה מי הוא. תסתכל על הצל, ומצא לאיזו תמונה הוא שייך.',
      demoSpec: { type: 'shadowDemo', e: '🐘', n: 'פיל' },
      gen: qShadow
    },
    {
      id: 3, name: 'משחק זיכרון', icon: '🧠',
      explain: 'משחק זיכרון! כל הכרטיסים הפוכים. הפוך שניים: אם יש בהם אותה תמונה - זה זוג, והם נשארים פתוחים. אם לא - הם נסגרים, אז תזכור איפה כל תמונה!',
      demoSpec: { type: 'memoryDemo', items: ['🐶', '🍎'] },
      gen: () => qMemory(3)
    },
    {
      id: 4, name: 'מה נעלם?', icon: '🙈',
      explain: 'תראה ארבע תמונות. תסתכל טוב ותזכור אותן, כי עוד רגע אחת תיעלם! ואז תגיד לי: מה נעלם?',
      demoSpec: { type: 'vanishDemo', items: ['🐶', '🍎', '🚗', '⭐'], goneIdx: 2 },
      gen: () => qVanish(4, 3)
    },
    {
      id: 5, name: 'סדר לפי גודל', icon: '📏',
      explain: 'מסדרים לפי גודל! אותה חיה בכמה גדלים. לחץ קודם על הכי קטנה, אחר כך על הגדולה יותר, וככה עד הכי גדולה. ולפעמים הפוך: מהגדול לקטן! תקשיב מה מבקשים.',
      demoSpec: { type: 'orderDemo', e: '🐘' },
      gen: () => mix([[5, () => qOrder(3, 'asc')], [2, () => qOrder(3, 'desc')], [2, () => qOrder(4, 'asc')], [1, () => qOrder(4, 'desc')]])
    },
    {
      id: 6, name: 'מי לא שייך?', icon: '🕵️',
      explain: 'ארבע תמונות. שלוש הולכות ביחד - למשל שלוש חיות, או שלושה דברים שעפים - ואחת לא שייכת! תחשוב מה משותף לשלוש, ומצא את זאת שלא.',
      demoSpec: { type: 'oddDemo', items: ['🐶', '🐱', '🚗', '🐮'], oddIdx: 2, say: 'כלב, חתול ופרה הם חיות, אבל מכונית - לא!' },
      gen: () => qOdd(draw('cats', CATS))
    },
    {
      id: 7, name: 'מה הולך ביחד?', icon: '🧦',
      explain: 'יש דברים שהולכים ביחד: גרב ונעל, מפתח ומנעול, דבורה ודבש. תראה תמונה, ומצא מה הולך איתה. לחץ על הזוגות למעלה כדי לשמוע למה.',
      demoSpec: { type: 'pairDemo', pairs: ['🧦', '🔑', '🐝'] },
      gen: () => qPair(4)
    },
    {
      id: 8, name: 'הפכים', icon: '🔥',
      explain: 'הפכים! חם וקר, יום ולילה, גדול וקטן, מהיר ואיטי. אני אגיד מילה, ואתה תמצא את ההפך שלה. לחץ על הזוגות למעלה כדי לשמוע.',
      demoSpec: { type: 'oppDemo', adjs: ['חם', 'יום', 'גדול', 'מלא'] },
      gen: qOpposite
    },
    {
      id: 9, name: 'מה בא אחר כך?', icon: '🎵',
      explain: 'סדרה! תפוח, בננה, תפוח, בננה... ומה בא אחר כך? תפוח! הסדרה חוזרת על עצמה. תגיד אותה בקול, ותדע מה בא.',
      demoSpec: { type: 'patternDemo', unit: 'AB', items: ['🍎', '🍌'], len: 4 },
      gen: () => mix([[7, () => qPattern({ unit: 'AB', len: pick([4, 5]), optCount: 3 })], [3, () => qPattern({ unit: 'ABC', len: pick([5, 6]), optCount: 3 })]])
    },
    {
      id: 10, name: 'חידות', icon: '🤔',
      explain: 'חידות! אני אספר על משהו בלי להגיד מה הוא, ואתה תנחש. למשל: יש לי אוזניים ארוכות ואני אוהב גזר. מי אני? ארנב! תקשיב טוב לכל הרמזים.',
      demoSpec: { type: 'riddleDemo', e: '🐰', text: 'יש לי אוזניים ארוכות, אני קופץ, ואוהב לאכול גזר. מי אני?', answer: 'ארנב' },
      gen: qRiddle
    },
    {
      id: 11, name: 'איפה החתול?', icon: '🐱',
      explain: 'איפה החתול? על השולחן, מתחת לשולחן, או לידו? בתוך הקופסה או עליה? תקשיב טוב למילה, ומצא את התמונה הנכונה. לחץ על התמונות למעלה כדי לשמוע.',
      demoSpec: { type: 'positionDemo', e: '🐱', prop: 'table', positions: ['on', 'under', 'next'] },
      gen: qPosition
    },
    {
      id: 12, name: 'מה קורה קודם?', icon: '🐣',
      explain: 'מה קורה קודם? ביצה, אחר כך אפרוח בוקע, ואחר כך תרנגולת! תראה תמונות מעורבבות, ותסדר אותן לפי הסדר: לחץ קודם על מה שקורה ראשון.',
      demoSpec: { type: 'storyDemo', story: 0 },
      gen: qStory
    },
    {
      id: 13, name: 'איפה יש יותר?', icon: '⚖️',
      explain: 'שני כרטיסים עם תמונות. באיזה יש יותר? ובאיזה פחות? תקשיב מה שואלים, תסתכל טוב, ואפשר גם לספור.',
      demoSpec: { type: 'compareDemo', e: '🍎', counts: [3, 7] },
      gen: () => qCompare(draw('cmpMode', ['more', 'more', 'less']))
    },
    {
      id: 14, name: 'לפני ואחרי', icon: '🔢',
      explain: 'המספרים צועדים בסדר: אחת, שתיים, שלוש... מה בא אחרי שש? שבע! ומה בא לפני ארבע? שלוש! תספור בקול, ותמצא.',
      demoSpec: { type: 'numLineDemo', from: 4, to: 8, mark: 6 },
      gen: () => qBeforeAfter(draw('baMode', ['after', 'after', 'before']))
    },
    {
      id: 15, name: 'כמה מתחבאים?', icon: '📦',
      explain: 'היו חמישה תפוחים. כמה מהם נכנסו לקופסה ומתחבאים! ספור כמה נשארו בחוץ, ותחשוב: כמה יש בקופסה?',
      demoSpec: { type: 'hiddenDemo', e: '🍎', total: 5, k: 2 },
      gen: qHidden
    },
    {
      id: 16, name: 'סדרות קשות', icon: '🎼',
      explain: 'סדרות קשות יותר! לפעמים משהו מופיע פעמיים: תפוח, תפוח, בננה, תפוח, תפוח, בננה. ולפעמים החור באמצע הסדרה! תגיד את הסדרה לאט בקול.',
      demoSpec: { type: 'patternDemo', unit: 'AAB', items: ['🍎', '🍌'], len: 6 },
      gen: () => qPattern({ unit: draw('hardUnit', HARD_UNITS), len: pick([6, 7]), optCount: 4, hole: Math.random() < 0.4 })
    },
    {
      id: 17, name: 'חלוקה שווה', icon: '🍬',
      explain: 'מחלקים שווה בשווה! יש שש סוכריות ושני ילדים: סוכרייה לזה, סוכרייה לזה, ושוב, עד שנגמרות. כל ילד קיבל שלוש! כמה מקבל כל ילד?',
      demoSpec: { type: 'shareDemo', e: '🍬', kids: 2, each: 3 },
      gen: qShare
    },
    {
      id: 18, name: 'זיכרון גדול', icon: '🃏',
      explain: 'משחק זיכרון גדול, עם הרבה זוגות! תזכור טוב איפה כל תמונה.',
      demoSpec: { type: 'memoryDemo', items: ['🐱', '🍌', '⭐'] },
      gen: () => qMemory(draw('bigMem', [5, 6]))
    },
    {
      id: 19, name: 'מה נעלם? עם שש', icon: '🔦',
      explain: 'עכשיו שש תמונות! תסתכל טוב, תזכור את כולן, ואחת תיעלם. מה נעלם?',
      demoSpec: { type: 'vanishDemo', items: ['🐶', '🍎', '🚗', '⭐', '🐸', '🎈'], goneIdx: 4 },
      gen: () => qVanish(6, 4)
    },
    {
      id: 20, name: 'אלוף החשיבה', icon: '🏆',
      explain: 'האתגר הגדול! כל המשחקים הקשים בערבוב: זיכרון, מה נעלם, סדרות, חידות, ומספרים. מי שמסיים - אלוף החשיבה!',
      demoSpec: { type: 'champDemo' },
      gen: () => mix([
        [2, () => qVanish(6, 4)],
        [2, () => qMemory(5)],
        [2, () => qPattern({ unit: draw('champUnit', HARD_UNITS), len: pick([6, 7]), optCount: 4, hole: Math.random() < 0.5 })],
        [2, qHidden],
        [2, qShare],
        [2, qRiddle],
        [1, qPosition],
        [1, () => qCompare(pick(['more', 'less']))],
        [1, () => qBeforeAfter(pick(['after', 'before']))],
        [1, qSpotMirror],
        [1, () => qOrder(4, pick(['asc', 'desc']))],
        [1, qStory]
      ])
    }
  ];

  return {
    LEVELS, ITEMS, itemOf, COUNT_ITEMS, DOTS, DIFF_PAIRS, CATS, PAIRS, OPPOSITES, RIDDLES,
    STORIES, PROPS, POS_PHRASE, KIDS, SIZES, countPhrase, heList, makeDeck, shuffle
  };
})();

if (typeof module !== 'undefined') module.exports = ThinkingLevels;
