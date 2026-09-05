/* ═══════════════ משחק האותיות והמילים - 20 רמות ═══════════════
 * מסלול לימוד לילד שעוד לא קורא, בלי ניקוד (כתיב מלא):
 *   הכרת אותיות (1-6) ← אות פותחת, אות סוגרת, סופיות והברות (7-14)
 *   ← הרכבת מילים בהדרגה: אות סופית, פותחת, סוגרת, באמצע, שתיים, ואז בנייה (15-20)
 *   ← קריאה (21-23) ← מילים ארוכות: אחת, שתיים, שלוש חסרות, בנייה, קריאה (24-30)
 *   אחרי כל 5 רמות יש מבחן קטן על מה שנלמד (מנוהל במנוע, ראה engine.js).
 *
 * עקרונות חשובים:
 * - הילד לא קורא, לכן כל הנחיה עוברת בקול. המילה שעליה שואלים לעולם לא
 *   כתובה על המסך (רק התמונה שלה) - אחרת אפשר "לראות" את התשובה.
 * - אין ניקוד בשום מקום על המסך. שמות האותיות מנוקדים רק בטקסט להקראה,
 *   כדי שקול הדפדפן יהגה אותם נכון (בֵּית ולא בַּיִת).
 * - אותיות שנשמעות אותו דבר (א/ע/ה, כ/ק/ח, ט/ת, ס/ש, ב/ו) לעולם לא יופיעו
 *   כמסיחים זו של זו בתרגילי צליל - אין תשובה "כמעט נכונה".
 * - כל מאגר (אותיות, מילים) נשלף מ"חפיסה" מעורבבת: לא חוזרים על אותו
 *   פריט עד שכל החפיסה נגמרה, ולכן אותה שאלה לא חוזרת פעמיים ברצף.
 * - בתרגילי תמונות מקריאים את שמות כל התמונות (בסדר שבו הן על המסך),
 *   כדי שהילד ידע איך קוראים לכל תמונה.
 * המחוללים טהורים (בלי DOM) לבדיקה ב-node.
 */

const LettersLevels = (() => {

  /* ─── עזרים ─── */
  const ri = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = ri(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* חפיסה: מערבבים, שולפים אחד-אחד, וכשנגמר מערבבים מחדש.
     הפריט הראשון בסבב החדש לעולם לא יהיה זה שסגר את הסבב הקודם -
     כך שני שליפות רצופות תמיד שונות (כשיש יותר מפריט אחד). */
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

  /* ─── האותיות ─── */
  /* sname - שם להקראה בלבד (מנוקד כדי שהקול יהגה נכון, לא מוצג על המסך);
     sg - קבוצת צליל: אותיות באותה קבוצה נשמעות דומה ולא ישמשו כמסיחים זו של זו */
  const LETTERS = [
    { ch: 'א', sname: 'אָלֶף', sg: 'אעה' },
    { ch: 'ב', sname: 'בֵּית', sg: 'בו' },
    { ch: 'ג', sname: 'גִימֶל', sg: null },
    { ch: 'ד', sname: 'דָלֶת', sg: null },
    { ch: 'ה', sname: 'הֵא', sg: 'אעה' },
    { ch: 'ו', sname: 'וָאו', sg: 'בו' },
    { ch: 'ז', sname: 'זַיִן', sg: null },
    { ch: 'ח', sname: 'חֵית', sg: 'כקח' },
    { ch: 'ט', sname: 'טֵית', sg: 'טת' },
    { ch: 'י', sname: 'יוֹד', sg: null },
    { ch: 'כ', sname: 'כָּף', sg: 'כקח', final: 'ך' },
    { ch: 'ל', sname: 'לָמֶד', sg: null },
    { ch: 'מ', sname: 'מֵם', sg: null, final: 'ם' },
    { ch: 'נ', sname: 'נוּן', sg: null, final: 'ן' },
    { ch: 'ס', sname: 'סָמֶך', sg: 'סש' },
    { ch: 'ע', sname: 'עַיִן', sg: 'אעה' },
    { ch: 'פ', sname: 'פֵּא', sg: null, final: 'ף' },
    { ch: 'צ', sname: 'צָדִי', sg: null, final: 'ץ' },
    { ch: 'ק', sname: 'קוֹף', sg: 'כקח' },
    { ch: 'ר', sname: 'רֵישׁ', sg: null },
    { ch: 'ש', sname: 'שִׁין', sg: 'סש' },
    { ch: 'ת', sname: 'תָּיו', sg: 'טת' }
  ];

  const byChar = {};
  LETTERS.forEach(L => { byChar[L.ch] = L; });
  const ALL_CHARS = LETTERS.map(L => L.ch);

  const FINALS = LETTERS.filter(L => L.final).map(L => ({ reg: L.ch, fin: L.final }));
  const finToReg = {};
  FINALS.forEach(f => { finToReg[f.fin] = f.reg; });

  /* האותיות כפי שהן נראות בסוף מילה (כ←ך, מ←ם...) - המסיחים לאות הסוגרת */
  const END_CHARS = LETTERS.map(L => L.final || L.ch);

  const regOf = ch => finToReg[ch] || ch;
  const sgOf = ch => (byChar[regOf(ch)] || {}).sg || null;
  /* האם שתי אותיות נשמעות אותו דבר (כולל אות וצורתה הסופית) */
  const sameSound = (a, b) => regOf(a) === regOf(b) || (!!sgOf(a) && sgOf(a) === sgOf(b));

  /* שם האות להקראה: "מֵם", ולצורה סופית - "מֵם סופית" */
  const letterName = ch => finToReg[ch] ? byChar[finToReg[ch]].sname + ' סופית' : byChar[ch].sname;

  /* אותיות דומות חזותית - לרמת "אותיות דומות" ולמסיחים בתרגילי כתיב */
  const LOOKALIKE = {
    'ב': ['כ', 'פ'], 'כ': ['ב', 'נ'], 'ג': ['נ', 'ז'], 'נ': ['ג', 'כ'],
    'ד': ['ר', 'ה'], 'ר': ['ד', 'כ'], 'ה': ['ח', 'ת'], 'ח': ['ה', 'ת'],
    'ת': ['ח', 'ה'], 'ו': ['ז', 'י'], 'ז': ['ו', 'ג'], 'י': ['ו', 'ז'],
    'מ': ['ט', 'ס'], 'ט': ['מ', 'ס'], 'ס': ['מ', 'ט'], 'ע': ['צ', 'ש'],
    'צ': ['ע', 'ז'], 'פ': ['ב', 'כ'], 'ק': ['ר', 'ה'], 'ש': ['ע', 'ת']
  };
  const LOOK_KEYS = Object.keys(LOOKALIKE);

  /* בחירת אותיות מסיחות: בלי התשובה ובלי אותיות שנשמעות כמוה */
  function distractorLetters(answer, count, { pool = ALL_CHARS, lookalikes = false } = {}) {
    const out = [];
    const add = ch => {
      if (out.length < count && !sameSound(ch, answer) && !out.includes(ch)) out.push(ch);
    };
    if (lookalikes) shuffle(LOOKALIKE[regOf(answer)] || []).forEach(add);
    shuffle(pool).forEach(add);
    return out;
  }

  /* ─── מאגר המילים ─── */
  /* w - המילה בכתיב מלא (בלי ניקוד), e - אמוג'י (ייחודי לכל מילה!),
     syl - מספר הברות (null = לא חד-משמעי, לא ישמש בתרגילי הברות),
     kw - מילת מפתח ללימוד האות הראשונה שלה (רמות 1-6).
     מילים של 6 אותיות ומעלה, או עם וו/יי כפולות (כלל כתיב שאי אפשר לשמוע),
     משמשות רק לתרגילי צליל, תמונות והברות - לא לקריאה ובנייה. */
  const W = (w, e, syl, kw) => ({ w, e, syl, kw: !!kw });
  const WORDS = [
    // ── שתי אותיות ──
    W('דג', '🐟', 1, 1), W('יד', '✋', 1, 1), W('לב', '❤️', 1, 1), W('הר', '⛰️', 1, 1),
    W('עץ', '🌳', 1, 1), W('אש', '🔥', 1), W('פה', '👄', 1), W('אף', '👃', 1),
    W('צב', '🐢', 1, 1), W('נר', '🕯️', 1, 1), W('כד', '🏺', 1), W('שן', '🦷', 1, 1),
    W('עז', '🐐', 1), W('כף', '🥄', 1), W('סל', '🧺', 1), W('ים', '🌊', 1, 1),
    W('עט', '🖊️', 1), W('תה', '🍵', 1), W('זר', '💐', 1, 1), W('פח', '🗑️', 1),
    // ── שלוש אותיות ──
    W('דוב', '🐻', 1, 1), W('סוס', '🐴', 1, 1), W('קוף', '🐵', 1, 1), W('פיל', '🐘', 1, 1),
    W('תות', '🍓', 1, 1), W('מיץ', '🧃', 1), W('תיק', '🎒', 1, 1), W('תוף', '🥁', 1),
    W('כלב', '🐶', 2, 1), W('ילד', '👦', 2, 1), W('פרח', '🌸', 2, 1), W('מים', '💧', 2, 1),
    W('שמש', '☀️', 2, 1), W('נחש', '🐍', 2, 1), W('ספר', '📖', 2, 1), W('גמל', '🐫', 2, 1),
    W('דגל', '🚩', 2), W('בית', '🏠', 2, 1), W('עין', '👁️', 2, 1), W('רגל', '🦵', 2, 1),
    W('נעל', '👟', 2, 1), W('דלת', '🚪', 2, 1), W('ענן', '☁️', 2, 1), W('ירח', '🌙', null, 1),
    W('לחם', '🍞', 2, 1), W('גזר', '🥕', 2, 1), W('ורד', '🌹', 2, 1), W('חלב', '🥛', 2, 1),
    W('פרה', '🐄', 2, 1), W('כבש', '🐑', 2), W('נמר', '🐯', 2, 1), W('זאב', '🐺', 2, 1),
    W('אגס', '🍐', 2, 1), W('מלך', '🤴', 2, 1), W('כתר', '👑', 2, 1), W('גשם', '🌧️', 2),
    W('שלג', '❄️', 2, 1), W('קשת', '🌈', 2, 1), W('עלה', '🍃', 2), W('ברק', '⚡', 2),
    W('דקל', '🌴', 2), W('סבא', '👴', 2), W('אבא', '👨', 2), W('אמא', '👩', 2),
    W('פיה', '🧚', 2), W('גרב', '🧦', 2), W('מפה', '🗺️', 2), W('קפה', '☕', 2, 1),
    W('מרק', '🍲', 2), W('עצם', '🦴', 2), W('דבש', '🍯', null),
    // ── ארבע אותיות ──
    W('כוכב', '⭐', 2, 1), W('בלון', '🎈', 2, 1), W('אריה', '🦁', 2, 1), W('חתול', '🐱', 2, 1),
    W('בננה', '🍌', 3, 1), W('רכבת', '🚂', 3, 1), W('פרפר', '🦋', 2, 1), W('כובע', '🧢', 2, 1),
    W('שעון', '⌚', 2, 1), W('עוגה', '🎂', 2, 1), W('תפוח', '🍎', null, 1), W('מפתח', '🔑', null, 1),
    W('אוזן', '👂', 2), W('אוטו', '🚗', 2, 1), W('מטוס', '✈️', 2, 1), W('מתנה', '🎁', 3, 1),
    W('ליצן', '🤡', 2, 1), W('כדור', '⚽', 2, 1), W('טווס', '🦚', 2, 1), W('תוכי', '🦜', 2, 1),
    W('תנין', '🐊', 2), W('ארנב', '🐰', 2), W('עכבר', '🐭', 2, 1), W('חזיר', '🐷', 2, 1),
    W('שועל', '🦊', 2, 1), W('זברה', '🦓', 2, 1), W('פנדה', '🐼', 2), W('קרנף', '🦏', 2),
    W('כריש', '🦈', 2), W('סרטן', '🦀', 2), W('נמלה', '🐜', 3), W('לטאה', '🦎', 3),
    W('עטלף', '🦇', 3), W('תפוז', '🍊', 2), W('תירס', '🌽', 2), W('פיצה', '🍕', 2, 1),
    W('ביצה', '🥚', 2), W('אורז', '🍚', 2), W('אגוז', '🥜', 2), W('פלפל', '🌶️', 2),
    W('מיטה', '🛏️', 2), W('שמלה', '👗', 2), W('כפפה', '🧤', null), W('טבעת', '💍', 3, 1),
    W('דובי', '🧸', 2), W('פאזל', '🧩', 2), W('סבון', '🧼', 2, 1), W('מגנט', '🧲', 2),
    W('סירה', '⛵', 2, 1), W('מסוק', '🚁', 2), W('רקטה', '🚀', 3, 1), W('ילדה', '👧', 2),
    W('לשון', '👅', 2), W('מחשב', '💻', 2), W('מלכה', '👸', 2), W('סבתא', '👵', 2),
    W('שוטר', '👮', 2), W('וופל', '🧇', 2, 1),
    // ── מילים ארוכות: 5 אותיות גם לקריאה ובנייה ברמות הגבוהות, 6+ רק לצליל, תמונות והברות ──
    W('טלפון', '📱', 3, 1), W('חולצה', '👕', 2, 1), W('אבטיח', '🍉', null, 1), W('גלידה', '🍦', null, 1),
    W('ברווז', '🦆', 2, 1), W('דבורה', '🐝', null, 1), W('היפופוטם', '🦛', null, 1), W('המבורגר', '🍔', 3, 1),
    W('טרקטור', '🚜', null, 1), W('לימון', '🍋', 2, 1), W('ציפור', '🐦', 2, 1), W('צפרדע', '🐸', null, 1),
    W('קקטוס', '🌵', 2, 1), W('קיפוד', '🦔', 2, 1), W('רובוט', '🤖', 2, 1), W('גיטרה', '🎸', 3, 1),
    W('ינשוף', '🦉', 2), W('עכביש', '🕷️', 3), W('תמנון', '🐙', 3), W('תרנגול', '🐓', 3),
    W('דולפין', '🐬', 2), W('קואלה', '🐨', 3), W('חילזון', '🐌', 3), W('ענבים', '🍇', 3),
    W('אפרסק', '🍑', 3), W('גבינה', '🧀', null), W('שוקולד', '🍫', 3), W('מנורה', '💡', 3),
    W('מזוודה', '🧳', 3), W('מטרייה', '☂️', 3), W('מצלמה', '📷', 3), W('מנעול', '🔒', 2),
    W('פעמון', '🔔', 3), W('מטאטא', '🧹', 3), W('ספינה', '🚢', null), W('משאית', '🚚', 3),
    W('כבאית', '🚒', 3), W('אוטובוס', '🚌', 3), W('מכשפה', '🧙', 3), W('תינוק', '👶', 2),
    W('פסנתר', '🎹', null), W('עיפרון', '✏️', 3), W('פופקורן', '🍿', 2), W('מלפפון', '🥒', null),
    W('עגבנייה', '🍅', null), W('פטרייה', '🍄', null)
  ];

  WORDS.forEach(w => {
    w.u = [...w.w];             // אותיות המילה, אחת-אחת
    w.len = w.u.length;
    w.first = w.u[0];
    w.last = w.u[w.len - 1];
    w.dbl = /וו|יי/.test(w.w);  // וו/יי כפולות - כלל כתיב שאי אפשר לשמוע
    w.xl = w.len >= 6 || w.dbl; // לא לקריאה ובנייה: רק לתרגילי צליל, תמונות והברות
  });

  const wordOf = str => WORDS.find(x => x.w === str) || null;

  /* ─── מאגרים לפי שימוש ─── */
  const BY_FIRST = {}, BY_LAST = {};
  WORDS.forEach(w => {
    (BY_FIRST[w.first] = BY_FIRST[w.first] || []).push(w);
    (BY_LAST[w.last] = BY_LAST[w.last] || []).push(w);
  });
  const startingWith = ch => BY_FIRST[ch] || [];
  const endingWith = ch => BY_LAST[ch] || [];

  /* מילות המפתח של כל אות (הקצרות קודם - הן הפשוטות ביותר) */
  LETTERS.forEach(L => {
    L.kws = startingWith(L.ch).filter(w => w.kw).sort((a, b) => a.len - b.len);
  });

  /* מאגרי קריאה ובנייה לפי אורך (בלי מילים ארוכות מדי או עם אותיות כפולות) */
  const wordsByLen = n => WORDS.filter(w => w.len === n && !w.xl);
  const LEN2 = wordsByLen(2), LEN3 = wordsByLen(3), LEN4 = wordsByLen(4), LEN5 = wordsByLen(5);
  const LEN23 = [...LEN2, ...LEN3], LEN34 = [...LEN3, ...LEN4];
  const LEN234 = [...LEN23, ...LEN4], LEN45 = [...LEN4, ...LEN5];

  const LAST_PLAIN = WORDS.filter(w => !finToReg[w.last]);   // נגמרות באות רגילה
  const LAST_FINAL = WORDS.filter(w => finToReg[w.last]);    // נגמרות באות סופית
  const SHORT_FINAL = LAST_FINAL.filter(w => !w.xl && w.len <= 4); // קצרות שנגמרות בסופית - להשלמת אות סופית
  const FINAL_GLYPHS = FINALS.map(f => f.fin);

  const SYL_WORDS = WORDS.filter(w => w.syl);
  const SYL_BY_N = { 1: SYL_WORDS.filter(w => w.syl === 1), 2: SYL_WORDS.filter(w => w.syl === 2), 3: SYL_WORDS.filter(w => w.syl === 3) };
  const SYL_HARD = SYL_WORDS.filter(w => w.len >= 3);

  const START_POOL = ALL_CHARS.filter(ch => startingWith(ch).length >= 2);
  const END_POOL = END_CHARS.filter(ch => endingWith(ch).length >= 2);
  const SAME_START_WORDS = WORDS.filter(w => startingWith(w.first).length >= 2);
  const FINAL_COMBOS = [];
  FINALS.forEach(f => { FINAL_COMBOS.push({ pair: f, showFinal: true }, { pair: f, showFinal: false }); });

  /* מילים מסיחות לפי צליל: האות (הראשונה/האחרונה) שלהן לא נשמעת כמו האות
     המבוקשת, ולא כמו זו של מסיח אחר (בשביל מגוון), ותמונה שונה */
  function wordDistractorsBySound(ch, where, count, exclude) {
    const at = w => (where === 'first' ? w.first : w.last);
    const out = [];
    for (const w of shuffle(WORDS)) {
      if (out.length >= count) break;
      if (exclude.includes(w) || exclude.some(x => x.e === w.e)) continue;
      if (sameSound(at(w), ch)) continue;
      if (out.some(x => x.e === w.e || sameSound(at(x), at(w)))) continue;
      out.push(w);
    }
    return out;
  }

  /* מסיחי תמונות לקריאת מילה: מעדיפים מילים שמתחילות באותה אות */
  function wordDistractors(w, count, poolLens) {
    const pool = WORDS.filter(x => x !== w && x.e !== w.e && poolLens.includes(x.len));
    const sameFirst = pool.filter(x => x.first === w.first);
    const other = pool.filter(x => x.first !== w.first);
    const out = [];
    for (const x of shuffle(sameFirst)) if (out.length < Math.min(count - 1, 2)) out.push(x);
    for (const x of shuffle(other)) if (out.length < count && !out.includes(x)) out.push(x);
    for (const x of shuffle(pool)) if (out.length < count && !out.includes(x)) out.push(x);
    return out.slice(0, count);
  }

  /* ─── בוני תרגילים ─── */
  /* כל תרגיל: kind (pick/build), type (לבדיקות), key (למניעת חזרות במנוע),
     prompt (טקסט על המסך - בלי המילה!), speech (הקראה), hint, revealSpeech,
     answer, options, visual, word */

  const REVEAL_LETTER = 'התשובה הנכונה מהבהבת! לחץ עליה ונמשיך.';
  const SYL_HE = { 1: 'הברה אחת', 2: 'שתי הברות', 3: 'שלוש הברות' };
  const namesOf = ws => ws.map(x => x.w).join(', ');

  /* מצא את האות של מילת מפתח (רמות 1-6) */
  function qFindLetter(ch, pool, optCount, { lookalikes = false } = {}) {
    const w = draw('kw:' + ch, byChar[ch].kws);
    return {
      kind: 'pick', type: 'find', key: `first:${w.w}`,
      optStyle: 'letter',
      prompt: 'באיזו אות מתחילה המילה?',
      speech: `מצא את האות של ${w.w}! ${w.w}.`,
      hint: `תגיד לאט: ${w.w}. איזה צליל שומעים בהתחלה? חפש את האות שלו.`,
      revealSpeech: REVEAL_LETTER,
      answer: ch,
      options: shuffle([ch, ...distractorLetters(ch, optCount - 1, { pool, lookalikes })]),
      visual: { type: 'emoji', e: w.e },
      word: w
    };
  }

  /* האות הפותחת */
  function qFirst(w, optCount = 4) {
    return {
      kind: 'pick', type: 'first', key: `first:${w.w}`,
      optStyle: 'letter',
      prompt: 'באיזו אות מתחילה המילה?',
      speech: `באיזו אות מתחילה המילה ${w.w}? תגיד לאט: ${w.w}.`,
      hint: `תגיד ${w.w} לאט לאט, ותעצור אחרי הצליל הראשון. חפש את האות שלו.`,
      revealSpeech: REVEAL_LETTER,
      answer: w.first,
      options: shuffle([w.first, ...distractorLetters(w.first, optCount - 1)]),
      visual: { type: 'emoji', e: w.e },
      word: w
    };
  }

  /* האות הסוגרת (המסיחים בצורת סוף-מילה: ך ם ן ף ץ) */
  function qLast(w, optCount = 4) {
    const isFinal = !!finToReg[w.last];
    return {
      kind: 'pick', type: 'last', key: `last:${w.w}`,
      optStyle: 'letter',
      prompt: 'באיזו אות נגמרת המילה?',
      speech: `באיזו אות נגמרת המילה ${w.w}? תקשיב עד הסוף: ${w.w}.`,
      hint: `תגיד ${w.w} לאט לאט, ותקשיב טוב לצליל האחרון.` +
        (isFinal ? ' זכור: בסוף מילה יש אותיות עם צורה מיוחדת!' : ''),
      revealSpeech: REVEAL_LETTER,
      answer: w.last,
      options: shuffle([w.last, ...distractorLetters(w.last, optCount - 1, { pool: END_CHARS })]),
      visual: { type: 'emoji', e: w.e },
      word: w
    };
  }

  /* אותיות סופיות: זיהוי הזוג (רגילה ↔ סופית) */
  function qFinalPair({ pair, showFinal }) {
    const answer = showFinal ? pair.reg : pair.fin;
    const optionsPool = showFinal ? FINALS.map(f => f.reg) : FINALS.map(f => f.fin);
    const distract = shuffle(optionsPool.filter(x => x !== answer)).slice(0, 3);
    return {
      kind: 'pick', type: 'final', key: `final:${pair.reg}:${showFinal ? 'f' : 'r'}`,
      optStyle: 'letter',
      prompt: showFinal ? 'של איזו אות הצורה הסופית הזאת?' : 'מצא את הצורה הסופית!',
      speech: showFinal
        ? `זאת ${letterName(pair.fin)}, שבאה רק בסוף מילה. של איזו אות רגילה היא? הן דומות!`
        : `זאת האות ${letterName(pair.reg)}. בסוף מילה יש לה צורה מיוחדת. מצא אותה! הן דומות!`,
      hint: 'תסתכל טוב על הצורה: האות הסופית דומה מאוד לאות הרגילה שלה.',
      revealSpeech: REVEAL_LETTER,
      answer,
      options: shuffle([answer, ...distract]),
      visual: { type: 'bigGlyph', text: showFinal ? pair.fin : pair.reg }
    };
  }

  /* הברות: כמה חלקים יש במילה */
  function qSyllables(w) {
    return {
      kind: 'pick', type: 'syl', key: `syl:${w.w}`,
      optStyle: 'num',
      prompt: 'כמה הברות יש במילה?',
      speech: `כמה הברות יש במילה ${w.w}? תגיד אותה לאט, חלק חלק: ${w.w}!`,
      hint: `לחץ על הרמקול לשמוע לאט. תגיד ${w.w} חלק אחרי חלק, וספור את החלקים.`,
      revealSpeech: `במילה ${w.w} יש ${SYL_HE[w.syl]}. לחץ על המספר ${w.syl}!`,
      replayRate: 0.6,
      answer: w.syl,
      options: shuffle([1, 2, 3]),
      visual: { type: 'emoji', e: w.e },
      word: w
    };
  }

  /* הפוך: רואים אות, מוצאים תמונה שהמילה שלה מתחילה בה */
  function qStartsWith(ch) {
    const w = draw('sw:' + ch, startingWith(ch));
    const opts = shuffle([w, ...wordDistractorsBySound(ch, 'first', 2, [w])]);
    const name = letterName(ch);
    return {
      kind: 'pick', type: 'startsWith', key: `sw:${w.w}`,
      optStyle: 'emoji',
      prompt: 'איזו תמונה מתחילה באות הזאת?',
      speech: `הנה האות ${name}. איזו תמונה מתחילה באות ${name}? ${namesOf(opts)}.`,
      hint: `תגיד את השם של כל תמונה לאט: ${namesOf(opts)}. איזו מהן מתחילה בצליל של ${name}?`,
      revealSpeech: `המילה ${w.w} מתחילה באות ${name}! לחץ על התמונה של ${w.w}.`,
      answer: w.e,
      options: opts.map(x => x.e),
      visual: { type: 'bigGlyph', text: ch },
      word: w
    };
  }

  /* הפוך: רואים אות (בצורת סוף מילה), מוצאים תמונה שהמילה שלה נגמרת בה */
  function qEndsWith(ch) {
    const w = draw('ew:' + ch, endingWith(ch));
    const opts = shuffle([w, ...wordDistractorsBySound(ch, 'last', 2, [w])]);
    const name = letterName(ch);
    return {
      kind: 'pick', type: 'endsWith', key: `ew:${w.w}`,
      optStyle: 'emoji',
      prompt: 'איזו תמונה נגמרת באות הזאת?',
      speech: `הנה האות ${name}. איזו תמונה נגמרת באות ${name}? ${namesOf(opts)}.`,
      hint: `תגיד כל מילה עד הסוף: ${namesOf(opts)}. איזו מהן נגמרת בצליל של ${name}?`,
      revealSpeech: `המילה ${w.w} נגמרת באות ${name}! לחץ על התמונה של ${w.w}.`,
      answer: w.e,
      options: opts.map(x => x.e),
      visual: { type: 'bigGlyph', text: ch },
      word: w
    };
  }

  /* איזו תמונה מתחילה באותה אות כמו התמונה הגדולה */
  function qSameStart(w) {
    let mate = draw('ss:' + w.first, startingWith(w.first));
    if (mate === w) mate = draw('ss:' + w.first, startingWith(w.first));
    const opts = shuffle([mate, ...wordDistractorsBySound(w.first, 'first', 2, [w, mate])]);
    const name = letterName(w.first);
    return {
      kind: 'pick', type: 'sameStart', key: `ss:${w.w}:${mate.w}`,
      optStyle: 'emoji',
      prompt: 'איזו תמונה מתחילה באותה אות?',
      speech: `${w.w}. איזו תמונה מתחילה באותה אות כמו ${w.w}? ${namesOf(opts)}.`,
      hint: `המילה ${w.w} מתחילה באות ${name}. תגיד לאט: ${namesOf(opts)}. איזו מהן גם מתחילה באות ${name}?`,
      revealSpeech: `${w.w} וגם ${mate.w} מתחילות באות ${name}! לחץ על התמונה של ${mate.w}.`,
      answer: mate.e,
      options: opts.map(x => x.e),
      visual: { type: 'emoji', e: w.e },
      word: mate
    };
  }

  /* הפוך: שומעים מספר הברות, מוצאים את התמונה המתאימה */
  function qSylPick(n) {
    const ws = [1, 2, 3].map(k => draw('sp:' + k, SYL_BY_N[k]));
    const w = ws[n - 1];
    const opts = shuffle(ws);
    return {
      kind: 'pick', type: 'sylPick', key: `sp:${w.w}`,
      optStyle: 'emoji',
      prompt: `לאיזו תמונה יש ${SYL_HE[n]}?`,
      speech: `לאיזו תמונה יש ${SYL_HE[n]}? ${namesOf(opts)}. תגיד כל מילה לאט, וספור את החלקים.`,
      hint: `תגיד לאט וספור: ${namesOf(opts)}. לאיזו מהן יש ${SYL_HE[n]}?`,
      revealSpeech: `במילה ${w.w} יש ${SYL_HE[n]}! לחץ על התמונה של ${w.w}.`,
      replayRate: 0.7,
      answer: w.e,
      options: opts.map(x => x.e),
      visual: { type: 'bigGlyph', text: String(n) },
      word: w
    };
  }

  /* קריאת מילה ← תמונה */
  function qReadWord(w, optCount, poolLens) {
    const kwOfFirst = byChar[w.first].kws[0].w;
    const distract = wordDistractors(w, optCount - 1, poolLens);
    return {
      kind: 'pick', type: 'read', key: `read:${w.w}`,
      optStyle: 'emoji',
      prompt: 'קרא את המילה ומצא את התמונה!',
      speech: 'קרא את המילה שעל המסך, לאט, אות אחרי אות. ואז לחץ על התמונה הנכונה!',
      hint: `המילה מתחילה באותה אות כמו ${kwOfFirst}. קרא עוד פעם, לאט.`,
      revealSpeech: `המילה היא ${w.w}! לחץ על התמונה של ${w.w}.`,
      answer: w.e,
      options: shuffle([w.e, ...distract.map(x => x.e)]),
      visual: { type: 'wordCard', units: w.u },
      word: w
    };
  }

  /* תמונה ← המילה הכתובה */
  function qPickWord(w, optCount, poolLens) {
    const distract = wordDistractors(w, optCount - 1, poolLens);
    const kwOfFirst = byChar[w.first].kws[0].w;
    return {
      kind: 'pick', type: 'pickWord', key: `pw:${w.w}`,
      optStyle: 'word',
      prompt: 'איפה כתובה המילה ששמעת?',
      speech: `מצא איפה כתוב ${w.w}! קרא את המילים לאט - יש מילים שמנסות לבלבל אותך.`,
      hint: `${w.w} מתחיל כמו ${kwOfFirst}. אבל שים לב - קרא את כל המילה, לא רק את ההתחלה!`,
      revealSpeech: `המילה ${w.w} מהבהבת! לחץ עליה.`,
      answer: w.w,
      options: shuffle([w.w, ...distract.map(x => x.w)]),
      visual: { type: 'emoji', e: w.e },
      word: w
    };
  }

  /* האות החסרה. where - איפה החור:
     'final'  - האות האחרונה, והיא אות סופית (המסיחים: שאר האותיות הסופיות)
     'first'  - האות הראשונה     'last' - האחרונה (מסיחים בצורת סוף-מילה)
     'middle' - אות באמצע        'any'  - בכל מקום */
  const MISSING_PROMPT = {
    final: 'איזו אות סופית חסרה בסוף המילה?',
    first: 'איזו אות חסרה בהתחלת המילה?',
    last: 'איזו אות חסרה בסוף המילה?',
    middle: 'איזו אות חסרה באמצע המילה?',
    any: 'איזו אות חסרה במילה?'
  };

  function qMissing(w, where = 'any') {
    let idx;
    if (where === 'first') idx = 0;
    else if (where === 'last' || where === 'final') idx = w.len - 1;
    else if (where === 'middle') idx = ri(1, w.len - 2);
    else idx = ri(0, w.len - 1);
    const answer = w.u[idx];
    const atEnd = idx === w.len - 1;
    const pool = where === 'final' ? FINAL_GLYPHS : atEnd ? END_CHARS : ALL_CHARS;
    const distract = distractorLetters(answer, 3, { pool, lookalikes: !atEnd });
    const speech = {
      final: `המילה ${w.w} איבדה את האות האחרונה שלה - וזאת אות סופית! תגיד ${w.w} עד הסוף, ומצא את האות הסופית שחסרה.`,
      first: `המילה ${w.w} איבדה את האות הראשונה! תגיד לאט ${w.w}. איזה צליל שומעים ראשון? מצא את האות שלו.`,
      last: `המילה ${w.w} איבדה את האות האחרונה! תגיד ${w.w} עד הסוף. איזה צליל שומעים אחרון? מצא את האות שלו.`,
      middle: `למילה ${w.w} חסרה אות באמצע! תגיד ${w.w} לאט, צליל אחרי צליל, ומצא איזה צליל נשאר בלי אות.`,
      any: `אוי לא! המילה ${w.w} איבדה אות! תגיד לאט ${w.w}, ומצא איזו אות חסרה.`
    }[where];
    return {
      kind: 'pick', type: 'missing', where, key: `miss:${w.w}:${idx}`,
      optStyle: 'letter',
      prompt: MISSING_PROMPT[where],
      speech,
      hint: `תגיד ${w.w} לאט, צליל צליל, והצבע על כל אות. איפה הצליל שאין לו אות?` +
        (atEnd && finToReg[answer] ? ' זכור: בסוף מילה יש אותיות עם צורה מיוחדת!' : ''),
      revealSpeech: `האות החסרה מהבהבת! לחץ עליה ונשלים את המילה ${w.w}.`,
      answer,
      options: shuffle([answer, ...distract]),
      visual: { type: 'wordCard', units: w.u, blankIdx: idx, emoji: w.e },
      word: w,
      blankIdx: idx
    };
  }

  /* הרכבת מילה: k אותיות חסרות (k = כל האותיות ← בנייה מלאה). שאר האותיות
     מוצגות במקומן (given). האריחים הם בדיוק האותיות החסרות, בערבוב. */
  const K_HE = { 2: 'שתי אותיות', 3: 'שלוש אותיות', 4: 'ארבע אותיות', 5: 'חמש אותיות' };

  function qBuild(w, k = w.len) {
    k = Math.min(k, w.len);
    const blanks = shuffle(w.u.map((_, i) => i)).slice(0, k).sort((a, b) => a - b);
    const given = w.u.map((_, i) => i).filter(i => !blanks.includes(i));
    const letters = blanks.map(i => w.u[i]);
    let tiles = shuffle(letters);
    let guard = 0;
    while (letters.length > 1 && tiles.join('') === letters.join('') && guard++ < 10) tiles = shuffle(letters);
    const full = k === w.len;
    const kHe = K_HE[k] || `${k} אותיות`;
    return {
      kind: 'build', type: 'build', key: `build:${w.w}:${blanks.join('')}`,
      prompt: full ? 'בנה את המילה ששמעת!' : `השלם את המילה - חסרות ${kHe}!`,
      speech: full
        ? `בנה את המילה ${w.w}! לחץ על האותיות לפי הסדר: מה הצליל הראשון של ${w.w}?`
        : `למילה ${w.w} חסרות ${kHe}! תגיד ${w.w} לאט, ושים כל אות במקום שלה: לחץ לפי הסדר, או גרור אות למשבצת שלה.`,
      hint: `תגיד ${w.w} לאט, צליל אחרי צליל. האות הראשונה שחסרה באה קודם, ואחריה הבאות בתור.`,
      answer: w.u.join(''),
      options: [],
      build: { units: w.u, tiles, given, missing: k },
      visual: { type: 'emoji', e: w.e },
      word: w
    };
  }

  /* ─── הרמות ─── */

  const SET1 = ['א', 'ב', 'ג', 'ד', 'ה'];
  const SET2 = ['ו', 'ז', 'ח', 'ט', 'י'];
  const SET3 = ['כ', 'ל', 'מ', 'נ', 'ס', 'ע'];
  const SET4 = ['פ', 'צ', 'ק', 'ר', 'ש', 'ת'];

  const letterCards = chars => ({ type: 'letterCards', chars });

  const LEVELS = [
    {
      id: 1, name: 'אותיות ראשונות', icon: '🦁',
      explain: 'שלום חבר! היום נכיר חמש אותיות. לכל אות יש צליל משלה! תשמע מילה, תגיד אותה לאט, ומצא את האות שהמילה מתחילה בה. לחץ על הכרטיסים שלמעלה כדי לשמוע כל אות!',
      demoSpec: letterCards(SET1),
      gen: () => qFindLetter(draw('L1', SET1), SET1, 3)
    },
    {
      id: 2, name: 'עוד אותיות', icon: '🌹',
      explain: 'חמש אותיות חדשות! תקשיב טוב לצליל שבתחילת המילה - הוא יגלה לך את האות. לחץ על הכרטיסים כדי להכיר אותן!',
      demoSpec: letterCards(SET2),
      gen: () => qFindLetter(draw('L2', SET2), SET2, 3)
    },
    {
      id: 3, name: 'אותיות באמצע', icon: '⚽',
      explain: 'עוד שש אותיות חדשות! אתה כבר מכיר המון. לחץ על הכרטיסים לשמוע אותן.',
      demoSpec: letterCards(SET3),
      gen: () => qFindLetter(draw('L3', SET3), SET3, 3)
    },
    {
      id: 4, name: 'אותיות אחרונות', icon: '🍎',
      explain: 'האותיות האחרונות! אחרי הרמה הזאת תכיר את כל האלף בית. איזה גיבור!',
      demoSpec: letterCards(SET4),
      gen: () => qFindLetter(draw('L4', SET4), SET4, 3)
    },
    {
      id: 5, name: 'כל האותיות', icon: '🎨',
      explain: 'וואו! עכשיו משחקים עם כל האותיות של האלף בית בערבוב! תקשיב למילה ומצא את האות שלה.',
      demoSpec: letterCards(['א', 'י', 'מ', 'ק', 'ת']),
      gen: () => qFindLetter(draw('L5', ALL_CHARS), ALL_CHARS, 4)
    },
    {
      id: 6, name: 'אותיות דומות', icon: '👀',
      explain: 'יש אותיות שנראות כמעט אותו דבר, כמו תאומות! תסתכל טוב טוב על הצורה לפני שאתה בוחר. עיניים חדות!',
      demoSpec: { type: 'pairCards', pairs: [['ב', 'כ'], ['ד', 'ר'], ['ה', 'ח']], speakKeywords: true },
      gen: () => qFindLetter(draw('L6', LOOK_KEYS), ALL_CHARS, 3, { lookalikes: true })
    },
    {
      id: 7, name: 'האות הפותחת', icon: '📣',
      explain: 'עכשיו עם המון מילים חדשות! תשמע מילה, תגיד אותה לאט לאט, ותקשיב איזה צליל שומעים ראשון. הצליל הראשון מגלה את האות הפותחת!',
      demoSpec: { type: 'wordSound', items: [{ word: 'כלב', highlight: 'first' }, { word: 'שמש', highlight: 'first' }] },
      gen: () => qFirst(draw('L7', WORDS), 4)
    },
    {
      id: 8, name: 'האות הסוגרת', icon: '🔔',
      explain: 'עכשיו מקשיבים דווקא לסוף! תגיד את המילה עד הסוף, ותקשיב לצליל האחרון. הצליל האחרון מגלה את האות הסוגרת!',
      demoSpec: { type: 'wordSound', items: [{ word: 'ספר', highlight: 'last' }, { word: 'דג', highlight: 'last' }] },
      gen: () => qLast(draw('L8', LAST_PLAIN), 4)
    },
    {
      id: 9, name: 'אותיות סופיות', icon: '🎭',
      explain: 'סוד מגניב: לחמש אותיות יש עוד צורה, שמופיעה רק בסוף מילה! תסתכל על הזוגות - רואה כמה הם דומים? כשמילה נגמרת באחת האותיות האלה, בוחרים את הצורה הסופית שלה.',
      demoSpec: [
        { type: 'pairCards', pairs: FINALS.map(f => [f.reg, f.fin]), speakKeywords: false },
        { type: 'wordSound', items: [{ word: 'בלון', highlight: 'last' }, { word: 'מים', highlight: 'last' }] }
      ],
      gen: () => mix([
        [5, () => qLast(draw('L9f', LAST_FINAL), 4)],
        [3, () => qFinalPair(draw('L9p', FINAL_COMBOS))],
        [2, () => qLast(draw('L9r', LAST_PLAIN), 4)]
      ])
    },
    {
      id: 10, name: 'הברות', icon: '🎶',
      explain: 'כל מילה בנויה מחלקים קטנים שנקראים הברות. תגיד את המילה לאט לאט, ותרגיש איך היא נשברת לחלקים. במילה בננה יש שלוש הברות! תשמע מילה, תגיד אותה לאט, וספור את ההברות.',
      demoSpec: { type: 'syllables', words: ['דג', 'ספר', 'בננה'] },
      gen: () => qSyllables(draw('L10', SYL_WORDS))
    },
    {
      id: 11, name: 'פותחת או סוגרת?', icon: '🎯',
      explain: 'עכשיו צריך להקשיב טוב לשאלה! לפעמים אשאל באיזו אות המילה מתחילה, ולפעמים באיזו אות היא נגמרת. תקשיב מה שואלים, ואז תגיד את המילה לאט. ואל תשכח את האותיות הסופיות!',
      demoSpec: { type: 'wordSound', items: [{ word: 'כלב', highlight: 'first' }, { word: 'בלון', highlight: 'last' }] },
      gen: () => mix([
        [9, () => qFirst(draw('L11a', WORDS), 4)],
        [9, () => qLast(draw('L11b', WORDS), 4)],
        [2, () => qFinalPair(draw('L11c', FINAL_COMBOS))]
      ])
    },
    {
      id: 12, name: 'מי מתחיל באות?', icon: '🔎',
      explain: 'עכשיו הפוך! אני אגיד לך אות, ואתה תמצא את התמונה שהמילה שלה מתחילה באות הזאת. תגיד את השם של כל תמונה לאט, ותקשיב לצליל הראשון.',
      demoSpec: { type: 'letterWords', ch: 'כ', words: ['כלב', 'כוכב', 'כדור'], where: 'first' },
      gen: () => mix([
        [13, () => qStartsWith(draw('L12a', START_POOL))],
        [7, () => qSameStart(draw('L12b', SAME_START_WORDS))]
      ])
    },
    {
      id: 13, name: 'מי נגמר באות?', icon: '🎪',
      explain: 'ועכשיו עם הסוף! אני אגיד לך אות, ואתה תמצא את התמונה שהמילה שלה נגמרת באות הזאת. תגיד כל מילה עד הסוף, ותקשיב לצליל האחרון. זכור את האותיות הסופיות!',
      demoSpec: { type: 'letterWords', ch: 'ן', words: ['בלון', 'שעון', 'ליצן'], where: 'last' },
      gen: () => mix([
        [15, () => qEndsWith(draw('L13a', END_POOL))],
        [3, () => qLast(draw('L13b', WORDS), 4)],
        [2, () => qFinalPair(draw('L13c', FINAL_COMBOS))]
      ])
    },
    {
      id: 14, name: 'עוד הברות', icon: '🥁',
      explain: 'עוד משחק הברות! לפעמים תספור כמה הברות יש במילה, ולפעמים אני אגיד מספר, ואתה תמצא את התמונה שיש לה בדיוק כל כך הרבה הברות. תגיד כל מילה לאט לאט, וספור.',
      demoSpec: { type: 'syllables', words: ['סוס', 'כובע', 'מתנה'] },
      gen: () => mix([
        [1, () => qSyllables(draw('L14a', SYL_HARD))],
        [1, () => qSylPick(draw('L14b', [1, 2, 3]))]
      ])
    },
    {
      id: 15, name: 'משלימים אות סופית', icon: '🧩',
      explain: 'עכשיו מרכיבים מילים! רואים את המילה עם התמונה שלה, אבל האות האחרונה ברחה - וזאת אות סופית. תגיד את המילה עד הסוף, תקשיב לצליל האחרון, ומצא את האות הסופית שחסרה.',
      demoSpec: { type: 'missingDemo', word: 'בלון', idx: 3 },
      gen: () => qMissing(draw('L15', SHORT_FINAL), 'final')
    },
    {
      id: 16, name: 'משלימים אות פותחת', icon: '🚀',
      explain: 'הפעם האות הראשונה של המילה חסרה. תגיד את המילה לאט, תקשיב לצליל הראשון, ושים במקום הריק את האות שלו.',
      demoSpec: { type: 'missingDemo', word: 'כלב', idx: 0 },
      gen: () => qMissing(draw('L16', LEN23), 'first')
    },
    {
      id: 17, name: 'משלימים אות סוגרת', icon: '🏁',
      explain: 'עכשיו האות האחרונה חסרה. תגיד את המילה עד הסוף, ותמצא את האות של הצליל האחרון. זכור: בסוף מילה יש אותיות עם צורה מיוחדת!',
      demoSpec: { type: 'missingDemo', word: 'ספר', idx: 2 },
      gen: () => qMissing(draw('L17', LEN23), 'last')
    },
    {
      id: 18, name: 'משלימים אות באמצע', icon: '🍩',
      explain: 'הכי מאתגר: האות שחסרה מתחבאת באמצע המילה! תגיד את המילה לאט, צליל אחרי צליל, והצבע על כל אות. איפה הצליל שאין לו אות?',
      demoSpec: { type: 'missingDemo', word: 'כלב', idx: 1 },
      gen: () => qMissing(draw('L18', LEN34), 'middle')
    },
    {
      id: 19, name: 'שתי אותיות חסרות', icon: '✌️',
      explain: 'עכשיו ברחו שתי אותיות! רואים את המילה עם התמונה, ושתי משבצות ריקות. תגיד את המילה לאט, ושים כל אות במקום שלה: אפשר ללחוץ על האותיות לפי הסדר, או לגרור אות עם האצבע למשבצת שלה.',
      demoSpec: { type: 'buildDemo', word: 'כלב', given: [1] },
      gen: () => qBuild(draw('L19', LEN34), 2)
    },
    {
      id: 20, name: 'בונים מילים קצרות', icon: '🧱',
      explain: 'עכשיו אתה הבנאי! תשמע מילה, ובנה אותה בעצמך מההתחלה: לחץ על האותיות לפי הסדר, מהצליל הראשון ועד האחרון. אפשר גם לגרור כל אות למשבצת שלה.',
      demoSpec: { type: 'buildDemo', word: 'דג' },
      gen: () => qBuild(draw('L20', LEN23))
    },
    {
      id: 21, name: 'קוראים מילים!', icon: '📖',
      explain: 'הרגע הכי גדול - אתה קורא מילה אמיתית, בלי שאומרים לך אותה! תסתכל על כל אות, תגיד את הצליל שלה, וחבר את הצלילים ביחד למילה אחת. ואז מצא את התמונה של המילה.',
      demoSpec: { type: 'wordReveal', word: 'דג' },
      gen: () => qReadWord(draw('L21', LEN2), 3, [2, 3])
    },
    {
      id: 22, name: 'קוראים מילים גדולות', icon: '📚',
      explain: 'עכשיו מילים עם שלוש וארבע אותיות! קרא לאט, צליל אחרי צליל, ואז חבר הכול למילה אחת.',
      demoSpec: { type: 'wordReveal', word: 'כוכב' },
      gen: () => mix([
        [3, () => qReadWord(draw('L22a', LEN3), 4, [2, 3, 4])],
        [2, () => qReadWord(draw('L22b', LEN4), 4, [3, 4])]
      ])
    },
    {
      id: 23, name: 'מהתמונה למילה', icon: '🖼️',
      explain: 'הפוך על הפוך! רואים תמונה - ומחפשים את המילה הכתובה שלה. קרא את כל המילים לאט. זהירות: יש מילים דומות שמנסות לבלבל!',
      demoSpec: { type: 'wordReveal', word: 'גמל' },
      gen: () => qPickWord(draw('L23', LEN234), 3, [2, 3, 4])
    },
    {
      id: 24, name: 'אות חסרה במילה ארוכה', icon: '🧭',
      explain: 'גם המילים הארוכות מאבדות אותיות - ובכל מקום! תגיד את המילה לאט, והצבע על כל אות עד שתמצא את החור.',
      demoSpec: { type: 'missingDemo', word: 'חתול', idx: 2 },
      gen: () => qMissing(draw('L24', LEN45), 'any')
    },
    {
      id: 25, name: 'שתיים חסרות במילה ארוכה', icon: '🔦',
      explain: 'מילים ארוכות עם שתי אותיות חסרות! תגיד את המילה לאט, ושים כל אות במקום שלה - בלחיצה לפי הסדר, או בגרירה למשבצת.',
      demoSpec: { type: 'buildDemo', word: 'בלון', given: [0, 2] },
      gen: () => qBuild(draw('L25', LEN45), 2)
    },
    {
      id: 26, name: 'שלוש אותיות חסרות', icon: '🔥',
      explain: 'שלוש אותיות ברחו מהמילה! רק אחת או שתיים נשארו לעזור לך. תגיד את המילה לאט לאט, צליל אחרי צליל, ומלא את המשבצות לפי הסדר.',
      demoSpec: { type: 'buildDemo', word: 'חתול', given: [1] },
      gen: () => qBuild(draw('L26', LEN45), 3)
    },
    {
      id: 27, name: 'בונים מילים ארוכות', icon: '🏗️',
      explain: 'בנאי מומחה! עכשיו בונים לבד מילים של ארבע וחמש אותיות. תגיד את המילה לאט, ולחץ על האותיות לפי הסדר.',
      demoSpec: { type: 'buildDemo', word: 'בלון' },
      gen: () => qBuild(draw('L27', LEN45))
    },
    {
      id: 28, name: 'קוראים מילים ענקיות', icon: '🔭',
      explain: 'מילים של ארבע וחמש אותיות - וקוראים אותן לבד! קרא לאט, צליל אחרי צליל, ואז מצא את התמונה.',
      demoSpec: { type: 'wordReveal', word: 'טלפון' },
      gen: () => qReadWord(draw('L28', LEN45), 4, [3, 4, 5])
    },
    {
      id: 29, name: 'מהתמונה למילה ארוכה', icon: '🏷️',
      explain: 'רואים תמונה ומחפשים את המילה הארוכה שלה בין ארבע מילים. קרא כל מילה עד הסוף - ההתחלה לבד לא מספיקה!',
      demoSpec: { type: 'wordReveal', word: 'ציפור' },
      gen: () => qPickWord(draw('L29', LEN45), 4, [3, 4, 5])
    },
    {
      id: 30, name: 'אלוף המילים', icon: '🏆',
      explain: 'האתגר האחרון! מילים גדולות - לפעמים תקרא ותמצא תמונה, לפעמים תמצא את המילה הכתובה, לפעמים תשלים אותיות, ולפעמים תבנה בעצמך. מי שמסיים - יודע לקרוא! אלוף אמיתי!',
      demoSpec: { type: 'buildDemo', word: 'טלפון' },
      gen: () => mix([
        [6, () => qBuild(draw('L30a', LEN45))],
        [4, () => qBuild(draw('L30b', LEN45), 3)],
        [4, () => qReadWord(draw('L30c', LEN45), 4, [3, 4, 5])],
        [3, () => qMissing(draw('L30d', LEN45), 'any')],
        [3, () => qPickWord(draw('L30e', LEN45), 4, [3, 4, 5])]
      ])
    }
  ];

  return {
    LEVELS, LETTERS, byChar, WORDS, FINALS, LOOKALIKE, END_CHARS,
    wordOf, letterName, sameSound, makeDeck, shuffle
  };
})();

if (typeof module !== 'undefined') module.exports = LettersLevels;
