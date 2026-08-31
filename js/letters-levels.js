/* ═══════════════ משחק האותיות והמילים - 20 רמות ═══════════════
 * מסלול לימוד לילד שעוד לא קורא:
 *   הכרת אותיות (1-7) ← מודעות פונולוגית (8-10) ← ניקוד (11-14) ← קריאה ובנייה (15-20)
 *
 * עקרונות חשובים:
 * - הילד לא קורא, לכן כל הנחיה עוברת בקול. טקסטים להקראה נכתבים כך
 *   שיישמעו נכון גם בקול דפדפן פשוט (מילים שלמות, לא אותיות בודדות).
 * - אותיות שנשמעות אותו דבר (א/ע, כ/ק/ח, ט/ת, ס/ש, ב/ו) לעולם לא יופיעו
 *   כמסיחים זו של זו בתרגילי צליל - אין תשובה "כמעט נכונה".
 * - בתרגילי קריאה המסיחים מתחילים באותה אות כשאפשר, כדי שאי אפשר יהיה
 *   לנחש לפי האות הראשונה בלבד.
 * המחוללים טהורים (בלי DOM) לבדיקה ב-node.
 */

const LettersLevels = (() => {

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

  /* פירוק מילה מנוקדת ליחידות: אות + סימני הניקוד שאחריה */
  function splitUnits(word) {
    const units = [];
    for (const ch of word) {
      if (ch >= 'א' && ch <= 'ת') units.push(ch);
      else if (units.length) units[units.length - 1] += ch;
    }
    return units;
  }

  const baseOf = unit => unit[0];

  /* ─── האותיות ─── */
  /* sname - שם להקראה (מנוקד, למקומות לא קריטיים); kws - מילות מפתח עם אמוג'י;
     sg - קבוצת צליל (אותיות באותה קבוצה נשמעות דומה ולא ישמשו כמסיחים בתרגילי צליל) */
  const LETTERS = [
    { ch: 'א', sname: 'אָלֶף', sg: 'אע', kws: [{ w: 'אריה', e: '🦁' }, { w: 'אבטיח', e: '🍉' }] },
    { ch: 'ב', sname: 'בֵּית', sg: 'בו', kws: [{ w: 'בננה', e: '🍌' }, { w: 'בלון', e: '🎈' }] },
    { ch: 'ג', sname: 'גִימֶל', sg: null, kws: [{ w: 'גלידה', e: '🍦' }, { w: 'גמל', e: '🐫' }] },
    { ch: 'ד', sname: 'דָלֶת', sg: null, kws: [{ w: 'דג', e: '🐟' }, { w: 'דבורה', e: '🐝' }] },
    { ch: 'ה', sname: 'הֵא', sg: null, kws: [{ w: 'הר', e: '⛰️' }, { w: 'היפופוטם', e: '🦛' }] },
    { ch: 'ו', sname: 'וָאו', sg: 'בו', kws: [{ w: 'ורד', e: '🌹' }, { w: 'וופל', e: '🧇' }] },
    { ch: 'ז', sname: 'זַיִן', sg: null, kws: [{ w: 'זברה', e: '🦓' }, { w: 'זית', e: '🫒' }] },
    { ch: 'ח', sname: 'חֵית', sg: 'כק', kws: [{ w: 'חתול', e: '🐱' }, { w: 'חלב', e: '🥛' }] },
    { ch: 'ט', sname: 'טֵית', sg: 'טת', kws: [{ w: 'טרקטור', e: '🚜' }, { w: 'טלפון', e: '📱' }] },
    { ch: 'י', sname: 'יוֹד', sg: null, kws: [{ w: 'ילד', e: '👦' }, { w: 'ירח', e: '🌙' }] },
    { ch: 'כ', sname: 'כָּף', sg: 'כק', final: 'ך', kws: [{ w: 'כדור', e: '⚽' }, { w: 'כלב', e: '🐶' }] },
    { ch: 'ל', sname: 'לָמֶד', sg: null, kws: [{ w: 'לב', e: '❤️' }, { w: 'לימון', e: '🍋' }] },
    { ch: 'מ', sname: 'מֵם', sg: null, final: 'ם', kws: [{ w: 'מים', e: '💧' }, { w: 'מטוס', e: '✈️' }] },
    { ch: 'נ', sname: 'נוּן', sg: null, final: 'ן', kws: [{ w: 'נחש', e: '🐍' }, { w: 'נר', e: '🕯️' }] },
    { ch: 'ס', sname: 'סָמֶך', sg: 'סש', kws: [{ w: 'סוס', e: '🐴' }, { w: 'ספר', e: '📖' }] },
    { ch: 'ע', sname: 'עַיִן', sg: 'אע', kws: [{ w: 'ענן', e: '☁️' }, { w: 'עץ', e: '🌳' }] },
    { ch: 'פ', sname: 'פֵּא', sg: null, final: 'ף', kws: [{ w: 'פיל', e: '🐘' }, { w: 'פרח', e: '🌸' }] },
    { ch: 'צ', sname: 'צָדִי', sg: null, final: 'ץ', kws: [{ w: 'צב', e: '🐢' }, { w: 'ציפור', e: '🐦' }] },
    { ch: 'ק', sname: 'קוֹף', sg: 'כק', kws: [{ w: 'קוף', e: '🐵' }, { w: 'קשת', e: '🌈' }] },
    { ch: 'ר', sname: 'רֵישׁ', sg: null, kws: [{ w: 'רכבת', e: '🚂' }, { w: 'רובוט', e: '🤖' }] },
    { ch: 'ש', sname: 'שִׁין', sg: 'סש', kws: [{ w: 'שמש', e: '☀️' }, { w: 'שעון', e: '⌚' }] },
    { ch: 'ת', sname: 'תָּיו', sg: 'טת', kws: [{ w: 'תפוח', e: '🍎' }, { w: 'תות', e: '🍓' }] }
  ];

  const byChar = {};
  LETTERS.forEach(L => { byChar[L.ch] = L; });
  const ALL_CHARS = LETTERS.map(L => L.ch);

  const FINALS = [
    { reg: 'כ', fin: 'ך' }, { reg: 'מ', fin: 'ם' }, { reg: 'נ', fin: 'ן' },
    { reg: 'פ', fin: 'ף' }, { reg: 'צ', fin: 'ץ' }
  ];
  const finToReg = {}; FINALS.forEach(f => { finToReg[f.fin] = f.reg; });

  /* אותיות דומות חזותית - לרמת "אותיות דומות" ולמסיחים בתרגילי כתיב */
  const LOOKALIKE = {
    'ב': ['כ', 'פ'], 'כ': ['ב', 'נ'], 'ג': ['נ', 'ז'], 'נ': ['ג', 'כ'],
    'ד': ['ר', 'ה'], 'ר': ['ד', 'כ'], 'ה': ['ח', 'ת'], 'ח': ['ה', 'ת'],
    'ת': ['ח', 'ה'], 'ו': ['ז', 'י'], 'ז': ['ו', 'ג'], 'י': ['ו', 'ז'],
    'מ': ['ט', 'ס'], 'ט': ['מ', 'ס'], 'ס': ['מ', 'ט'], 'ע': ['צ', 'ש'],
    'צ': ['ע', 'ז'], 'פ': ['ב', 'כ'], 'ק': ['ר', 'ה'], 'ש': ['ע', 'ת']
  };

  /* בחירת אותיות מסיחות: בלי התשובה, ובתרגילי צליל - גם בלי אותיות שנשמעות כמוה */
  function distractorLetters(answer, count, { pool = ALL_CHARS, soundSafe = false, preferLookalikes = false } = {}) {
    const ansBase = finToReg[answer] || answer;
    const ansSg = byChar[ansBase] ? byChar[ansBase].sg : null;
    const ok = ch => {
      const base = finToReg[ch] || ch;
      if (base === ansBase) return false;
      if (soundSafe && ansSg && byChar[base] && byChar[base].sg === ansSg) return false;
      return true;
    };
    const out = [];
    if (preferLookalikes && LOOKALIKE[ansBase]) {
      for (const ch of shuffle(LOOKALIKE[ansBase])) {
        if (out.length < count && ok(ch) && !out.includes(ch)) out.push(ch);
      }
    }
    for (const ch of shuffle(pool)) {
      if (out.length >= count) break;
      if (ok(ch) && !out.includes(ch)) out.push(ch);
    }
    return out;
  }

  /* ─── מאגר המילים (מנוקד + הגייה פשוטה + אמוג'י + הברות) ─── */
  /* syl:null = לא חד-משמעי למחיאות כפיים, לא ישמש ברמת ההברות */
  const WORDS = [
    // שתי אותיות
    { w: 'דָּג', p: 'דג', e: '🐟', syl: 1 },
    { w: 'יָד', p: 'יד', e: '✋', syl: 1 },
    { w: 'לֵב', p: 'לב', e: '❤️', syl: 1 },
    { w: 'הַר', p: 'הר', e: '⛰️', syl: 1 },
    { w: 'עֵץ', p: 'עץ', e: '🌳', syl: 1 },
    { w: 'אֵשׁ', p: 'אש', e: '🔥', syl: 1 },
    { w: 'פֶּה', p: 'פה', e: '👄', syl: 1 },
    { w: 'אַף', p: 'אף', e: '👃', syl: 1 },
    { w: 'צָב', p: 'צב', e: '🐢', syl: 1 },
    { w: 'נֵר', p: 'נר', e: '🕯️', syl: 1 },
    { w: 'דֹּב', p: 'דוב', e: '🐻', syl: 1 },
    { w: 'כַּד', p: 'כד', e: '🏺', syl: 1 },
    // שלוש אותיות
    { w: 'סוּס', p: 'סוס', e: '🐴', syl: 1 },
    { w: 'קוֹף', p: 'קוף', e: '🐵', syl: 1 },
    { w: 'פִּיל', p: 'פיל', e: '🐘', syl: 1 },
    { w: 'תּוּת', p: 'תות', e: '🍓', syl: 1 },
    { w: 'כֶּלֶב', p: 'כלב', e: '🐶', syl: 2 },
    { w: 'יֶלֶד', p: 'ילד', e: '👦', syl: 2 },
    { w: 'פֶּרַח', p: 'פרח', e: '🌸', syl: 2 },
    { w: 'מַיִם', p: 'מים', e: '💧', syl: 2 },
    { w: 'שֶׁמֶשׁ', p: 'שמש', e: '☀️', syl: 2 },
    { w: 'נָחָשׁ', p: 'נחש', e: '🐍', syl: 2 },
    { w: 'סֵפֶר', p: 'ספר', e: '📖', syl: 2 },
    { w: 'גָּמָל', p: 'גמל', e: '🐫', syl: 2 },
    { w: 'דֶּגֶל', p: 'דגל', e: '🚩', syl: 2 },
    { w: 'בַּיִת', p: 'בית', e: '🏠', syl: 2 },
    { w: 'עַיִן', p: 'עין', e: '👁️', syl: 2 },
    { w: 'אֹזֶן', p: 'אוזן', e: '👂', syl: 2 },
    { w: 'רֶגֶל', p: 'רגל', e: '🦵', syl: 2 },
    { w: 'נַעַל', p: 'נעל', e: '👟', syl: 2 },
    { w: 'דֶּלֶת', p: 'דלת', e: '🚪', syl: 2 },
    { w: 'עָנָן', p: 'ענן', e: '☁️', syl: 2 },
    // ארבע אותיות
    { w: 'כּוֹכָב', p: 'כוכב', e: '⭐', syl: 2 },
    { w: 'בָּלוֹן', p: 'בלון', e: '🎈', syl: 2 },
    { w: 'אַרְיֵה', p: 'אריה', e: '🦁', syl: 2 },
    { w: 'חָתוּל', p: 'חתול', e: '🐱', syl: 2 },
    { w: 'בָּנָנָה', p: 'בננה', e: '🍌', syl: 3 },
    { w: 'רַכֶּבֶת', p: 'רכבת', e: '🚂', syl: 3 },
    { w: 'פַּרְפַּר', p: 'פרפר', e: '🦋', syl: 2 },
    { w: 'כּוֹבַע', p: 'כובע', e: '🧢', syl: 2 },
    { w: 'שָׁעוֹן', p: 'שעון', e: '⌚', syl: 2 },
    { w: 'עוּגָה', p: 'עוגה', e: '🎂', syl: 2 },
    { w: 'תַּפּוּחַ', p: 'תפוח', e: '🍎', syl: null },
    { w: 'מַפְתֵּחַ', p: 'מפתח', e: '🔑', syl: null },
    { w: 'חַלּוֹן', p: 'חלון', e: '🪟', syl: 2 },
    // מילים ארוכות - רק לתרגילי צליל והברות
    { w: 'אַרְנֶבֶת', p: 'ארנבת', e: '🐰', syl: 3, xl: true },
    { w: 'שׁוֹקוֹלָד', p: 'שוקולד', e: '🍫', syl: 3, xl: true },
    { w: 'מִטְרִיָּה', p: 'מטריה', e: '☂️', syl: 3, xl: true }
  ];

  WORDS.forEach(W => {
    W.u = splitUnits(W.w);
    W.len = W.u.length;
    W.first = baseOf(W.u[0]);
    W.last = baseOf(W.u[W.len - 1]);
  });

  const wordsByLen = n => WORDS.filter(W => W.len === n && !W.xl);

  /* ─── ניקוד ─── */
  const VOWELS = {
    kamatz: { mark: 'ָ', name: 'קמץ', shape: 'קו קטן עם רגל מתחת לאות', sound: 'a' },
    patach: { mark: 'ַ', name: 'פתח', shape: 'קו ישר מתחת לאות', sound: 'a' },
    chirik: { mark: 'ִ', name: 'חיריק', shape: 'נקודה אחת קטנה מתחת לאות', sound: 'i' },
    cholam: { suffix: 'וֹ', name: 'חולם', shape: 'האות וו עם נקודה למעלה', sound: 'o' },
    segol: { mark: 'ֶ', name: 'סגול', shape: 'שלוש נקודות מתחת לאות', sound: 'e' },
    tsere: { mark: 'ֵ', name: 'צירה', shape: 'שתי נקודות מתחת לאות', sound: 'e' },
    shuruk: { suffix: 'וּ', name: 'שורוק', shape: 'האות וו עם נקודה באמצע', sound: 'u' }
  };

  /* אותיות נוחות לתרגילי הברה (בלי אותיות שקטות וכפולות-צליל) */
  const SYL_LETTERS = [
    { glyph: 'בּ', plain: 'ב' }, { glyph: 'ג', plain: 'ג' }, { glyph: 'ד', plain: 'ד' },
    { glyph: 'ל', plain: 'ל' }, { glyph: 'מ', plain: 'מ' }, { glyph: 'נ', plain: 'נ' },
    { glyph: 'ס', plain: 'ס' }, { glyph: 'ק', plain: 'ק' }, { glyph: 'ר', plain: 'ר' },
    { glyph: 'שׁ', plain: 'ש' }, { glyph: 'תּ', plain: 'ת' }
  ];

  const syllGlyph = (L, v) => v.suffix ? L.glyph + v.suffix : L.glyph + v.mark;
  /* איות שנשמע נכון בהקראה: בָּ←"בה", בִּ←"בי", בּוֹ←"בו" */
  const HELPER = { a: 'ה', i: 'י', o: 'ו' };
  const syllSpeech = (L, v) => L.plain + (HELPER[v.sound] || '');

  /* ─── בוני תרגילים ─── */

  const REVEAL_LETTER = 'התשובה הנכונה מהבהבת! לחץ עליה ונמשיך.';

  /* מצא אות לפי מילת מפתח (רמות 1-6) */
  function qFindLetter(letterCh, pool, optCount, { preferLookalikes = false } = {}) {
    const L = byChar[letterCh];
    const kw = pick(L.kws);
    const distract = distractorLetters(letterCh, optCount - 1, { pool, preferLookalikes });
    return {
      kind: 'pick',
      optStyle: 'letter',
      prompt: `מצא את האות של "${kw.w}"`,
      speech: `מצא את האות של ${kw.w}! ${kw.w}.`,
      hint: `תגיד לאט: ${kw.w}. איזה צליל שומעים בהתחלה? חפש את האות שלו.`,
      revealSpeech: REVEAL_LETTER,
      answer: letterCh,
      options: shuffle([letterCh, ...distract]),
      visual: { type: 'emoji', e: kw.e }
    };
  }

  /* אותיות סופיות (רמה 7) */
  function qFinal(pair, showFinal) {
    const answer = showFinal ? pair.reg : pair.fin;
    const optionsPool = showFinal ? FINALS.map(f => f.reg) : FINALS.map(f => f.fin);
    const distract = shuffle(optionsPool.filter(x => x !== answer)).slice(0, 3);
    return {
      kind: 'pick',
      optStyle: 'letter',
      prompt: showFinal ? 'של איזו אות הצורה הסופית הזאת?' : 'מצא את הצורה הסופית!',
      speech: showFinal
        ? 'האות הזאת היא צורה סופית, שבאה רק בסוף מילה. של איזו אות רגילה היא? הן דומות!'
        : 'לאות הזאת יש צורה מיוחדת שבאה בסוף מילה. מצא אותה! הן דומות!',
      hint: 'תסתכל טוב על הצורה: האות הסופית דומה מאוד לאות הרגילה שלה.',
      revealSpeech: REVEAL_LETTER,
      answer,
      options: shuffle([answer, ...distract]),
      visual: { type: 'bigGlyph', text: showFinal ? pair.fin : pair.reg }
    };
  }

  /* הצליל הפותח / הסוגר (רמות 8-9) */
  function qSound(W, where) {
    const first = where === 'first';
    const answer = first ? W.first : W.last;
    const isFinalGlyph = !!finToReg[answer];
    const pool = isFinalGlyph ? FINALS.map(f => f.fin) : ALL_CHARS;
    const distract = distractorLetters(answer, 3, { pool, soundSafe: true });
    return {
      kind: 'pick',
      optStyle: 'letter',
      prompt: first ? `באיזו אות מתחילה המילה "${W.p}"?` : `באיזו אות נגמרת המילה "${W.p}"?`,
      speech: first
        ? `באיזו אות מתחילה המילה ${W.p}? תגיד לאט: ${W.p}.`
        : `באיזו אות נגמרת המילה ${W.p}? תקשיב עד הסוף: ${W.p}.`,
      hint: first
        ? `תגיד ${W.p} לאט לאט, ותעצור אחרי הצליל הראשון.`
        : `תגיד ${W.p} לאט לאט, ותקשיב טוב לצליל האחרון.`,
      revealSpeech: REVEAL_LETTER,
      answer,
      options: shuffle([answer, ...distract]),
      visual: { type: 'emoji', e: W.e }
    };
  }

  /* מחיאות כף - הברות (רמה 10) */
  function qClaps(W) {
    return {
      kind: 'pick',
      optStyle: 'num',
      prompt: `כמה מחיאות כף יש במילה "${W.p}"? 👏`,
      speech: `כמה מחיאות כף יש במילה ${W.p}? תגיד את המילה ומחא כפיים: ${W.p}!`,
      hint: `לחץ על הרמקול לשמוע לאט, מחא כף על כל חלק, וספור: ${W.p}.`,
      revealSpeech: `במילה ${W.p} יש ${W.syl === 1 ? 'מחיאת כף אחת' : W.syl + ' מחיאות כף'}. לחץ על המספר ${W.syl}!`,
      replayRate: 0.6,
      answer: W.syl,
      options: shuffle([1, 2, 3]),
      visual: { type: 'emoji', e: W.e }
    };
  }

  /* ניקוד לפי צליל (רמות 11-13) */
  function qVowelSound(vowelKeys, distractKeys) {
    const L = pick(SYL_LETTERS);
    const vKey = pick(vowelKeys);
    const v = VOWELS[vKey];
    const answer = syllGlyph(L, v);
    const options = shuffle([answer, ...shuffle(distractKeys.filter(k => k !== vKey))
      .slice(0, 2).map(k => syllGlyph(L, VOWELS[k]))]);
    const sound = syllSpeech(L, v);
    return {
      kind: 'pick',
      optStyle: 'letter',
      prompt: 'מצא את הצליל ששומעים 🔊',
      speech: `מצא את ${sound}! תקשיב שוב: ${sound}.`,
      hint: `${v.name} זה ${v.shape}. חפש את ${sound}.`,
      revealSpeech: 'הצליל הנכון מהבהב! לחץ עליו ונמשיך.',
      answer,
      options,
      visual: null
    };
  }

  /* ניקוד לפי שם וצורה (רמה 14) */
  function qVowelName(vowelKeys, allKeys) {
    const L = pick(SYL_LETTERS);
    const vKey = pick(vowelKeys);
    const v = VOWELS[vKey];
    const answer = syllGlyph(L, v);
    const distract = shuffle(allKeys.filter(k => k !== vKey)).slice(0, 2)
      .map(k => syllGlyph(L, VOWELS[k]));
    return {
      kind: 'pick',
      optStyle: 'letter',
      prompt: `מצא את ה${v.name}!`,
      speech: `מצא את ה${v.name}! ${v.name} זה ${v.shape}.`,
      hint: `חפש טוב: ${v.name} זה ${v.shape}.`,
      revealSpeech: `הנה ה${v.name}! הוא מהבהב, לחץ עליו.`,
      answer,
      options: shuffle([answer, ...distract]),
      visual: null
    };
  }

  /* מסיחי תמונות לקריאת מילה: מעדיפים מילים שמתחילות באותה אות */
  function wordDistractors(W, count, poolLens) {
    const pool = WORDS.filter(x => x.w !== W.w && !x.xl && x.e !== W.e);
    const sameFirst = pool.filter(x => x.first === W.first && poolLens.includes(x.len));
    const sameLen = pool.filter(x => x.first !== W.first && poolLens.includes(x.len));
    const out = [];
    for (const x of shuffle(sameFirst)) if (out.length < Math.min(count - 1, 2)) out.push(x);
    for (const x of shuffle(sameLen)) if (out.length < count && !out.includes(x)) out.push(x);
    for (const x of shuffle(pool)) if (out.length < count && !out.includes(x)) out.push(x);
    return out.slice(0, count);
  }

  /* קריאת מילה ← תמונה (רמות 15, 16, 20) */
  function qReadWord(W, optCount, poolLens) {
    const kwOfFirst = byChar[W.first] ? pick(byChar[W.first].kws).w : W.p;
    const distract = wordDistractors(W, optCount - 1, poolLens);
    return {
      kind: 'pick',
      optStyle: 'emoji',
      prompt: 'קרא את המילה ומצא את התמונה!',
      speech: 'קרא את המילה שעל המסך, לאט, צליל אחרי צליל. ואז לחץ על התמונה הנכונה!',
      hint: `המילה מתחילה באותה אות כמו ${kwOfFirst}. קרא עוד פעם, לאט.`,
      revealSpeech: `המילה היא ${W.p}! לחץ על התמונה של ${W.p}.`,
      answer: W.e,
      options: shuffle([W.e, ...distract.map(x => x.e)]),
      visual: { type: 'wordCard', units: W.u },
      word: W
    };
  }

  /* תמונה ← מילה כתובה (רמה 17) */
  function qPickWord(W, optCount, poolLens) {
    const distract = wordDistractors(W, optCount - 1, poolLens);
    const kwOfFirst = byChar[W.first] ? pick(byChar[W.first].kws).w : W.p;
    return {
      kind: 'pick',
      optStyle: 'word',
      prompt: `איפה כתוב "${W.p}"?`,
      speech: `מצא איפה כתוב ${W.p}! קרא את המילים לאט - יש מילים שמנסות לבלבל אותך.`,
      hint: `${W.p} מתחיל כמו ${kwOfFirst}. אבל שים לב - קרא את כל המילה, לא רק את ההתחלה!`,
      revealSpeech: `המילה ${W.p} מהבהבת! לחץ עליה.`,
      answer: W.w,
      options: shuffle([W.w, ...distract.map(x => x.w)]),
      visual: { type: 'emoji', e: W.e },
      word: W
    };
  }

  /* האות החסרה (רמה 18) */
  function qMissing(W) {
    const idx = ri(0, W.len - 1);
    const answer = baseOf(W.u[idx]);
    const isFinalGlyph = !!finToReg[answer];
    const pool = isFinalGlyph ? FINALS.map(f => f.fin) : ALL_CHARS;
    const distract = distractorLetters(answer, 3, { pool, soundSafe: true, preferLookalikes: !isFinalGlyph });
    return {
      kind: 'pick',
      optStyle: 'letter',
      prompt: `איזו אות חסרה במילה "${W.p}"?`,
      speech: `אוי לא! המילה ${W.p} איבדה אות! תגיד לאט ${W.p}, ומצא איזו אות חסרה.`,
      hint: `תגיד ${W.p} לאט, צליל צליל, והצבע על כל אות. איפה הצליל שאין לו אות?`,
      revealSpeech: `האות החסרה מהבהבת! לחץ עליה ונשלים את המילה ${W.p}.`,
      answer,
      options: shuffle([answer, ...distract]),
      visual: { type: 'wordCard', units: W.u, blankIdx: idx, emoji: W.e },
      word: W,
      blankIdx: idx
    };
  }

  /* בניית מילה מאותיות (רמות 19-20) */
  function qBuild(W) {
    let tiles = shuffle(W.u);
    let guard = 0;
    while (W.len > 1 && tiles.join('') === W.u.join('') && guard++ < 10) tiles = shuffle(W.u);
    return {
      kind: 'build',
      prompt: `בנה את המילה "${W.p}"!`,
      speech: `בנה את המילה ${W.p}! לחץ על האותיות לפי הסדר: מה הצליל הראשון של ${W.p}?`,
      hint: `תגיד ${W.p} לאט. הצליל הראשון בא ראשון, ואחריו הבאים בתור.`,
      answer: W.u.join(''),
      options: [],
      build: { units: W.u, tiles },
      visual: { type: 'emoji', e: W.e },
      word: W
    };
  }

  /* ─── הרמות ─── */

  const SET1 = ['א', 'ב', 'ג', 'ד', 'ה'];
  const SET2 = ['ו', 'ז', 'ח', 'ט', 'י'];
  const SET3 = ['כ', 'ל', 'מ', 'נ', 'ס', 'ע'];
  const SET4 = ['פ', 'צ', 'ק', 'ר', 'ש', 'ת'];

  const letterCardsDemo = chars => ({ type: 'letterCards', chars });

  const LEVELS = [
    {
      id: 1, name: 'אותיות ראשונות', icon: '🦁',
      explain: 'שלום חבר! היום נכיר חמש אותיות. לכל אות יש צליל משלה! תשמע מילה, תגיד אותה לאט, ומצא את האות שהמילה מתחילה בה. לחץ על הכרטיסים שלמעלה כדי לשמוע כל אות!',
      demoSpec: letterCardsDemo(SET1),
      gen: () => qFindLetter(pick(SET1), SET1, 3)
    },
    {
      id: 2, name: 'עוד אותיות', icon: '🌹',
      explain: 'חמש אותיות חדשות! תקשיב טוב לצליל שבתחילת המילה - הוא יגלה לך את האות. לחץ על הכרטיסים כדי להכיר אותן!',
      demoSpec: letterCardsDemo(SET2),
      gen: () => qFindLetter(pick(SET2), SET2, 3)
    },
    {
      id: 3, name: 'אותיות באמצע', icon: '⚽',
      explain: 'עוד שש אותיות חדשות! אתה כבר מכיר המון. לחץ על הכרטיסים לשמוע אותן.',
      demoSpec: letterCardsDemo(SET3),
      gen: () => qFindLetter(pick(SET3), SET3, 3)
    },
    {
      id: 4, name: 'אותיות אחרונות', icon: '🍎',
      explain: 'האותיות האחרונות! אחרי הרמה הזאת תכיר את כל האלף בית. איזה גיבור!',
      demoSpec: letterCardsDemo(SET4),
      gen: () => qFindLetter(pick(SET4), SET4, 3)
    },
    {
      id: 5, name: 'כל האותיות', icon: '🎨',
      explain: 'וואו! עכשיו משחקים עם כל האותיות של האלף בית בערבוב! תקשיב למילה ומצא את האות שלה.',
      demoSpec: letterCardsDemo(['א', 'י', 'מ', 'ק', 'ת']),
      gen: () => qFindLetter(pick(ALL_CHARS), ALL_CHARS, 4)
    },
    {
      id: 6, name: 'אותיות דומות', icon: '👀',
      explain: 'יש אותיות שנראות כמעט אותו דבר, כמו תאומות! תסתכל טוב טוב על הצורה לפני שאתה בוחר. עיניים חדות!',
      demoSpec: { type: 'pairCards', pairs: [['ב', 'כ'], ['ד', 'ר'], ['ה', 'ח']], speakKeywords: true },
      gen: () => qFindLetter(pick(Object.keys(LOOKALIKE)), ALL_CHARS, 3, { preferLookalikes: true })
    },
    {
      id: 7, name: 'אותיות סופיות', icon: '🎭',
      explain: 'סוד מגניב: לחמש אותיות יש עוד צורה, שמופיעה רק בסוף מילה! תסתכל על הזוגות שבחלון - רואה כמה הם דומים?',
      demoSpec: { type: 'pairCards', pairs: FINALS.map(f => [f.reg, f.fin]), speakKeywords: false },
      gen: () => qFinal(pick(FINALS), Math.random() < 0.5)
    },
    {
      id: 8, name: 'הצליל הפותח', icon: '📣',
      explain: 'עכשיו בלי עזרה! תשמע מילה, תגיד אותה לאט לאט, ותקשיב איזה צליל שומעים ראשון. הצליל הראשון מגלה את האות!',
      demoSpec: { type: 'wordSound', word: 'כֶּלֶב', highlight: 'first' },
      gen: () => qSound(pick(WORDS), 'first')
    },
    {
      id: 9, name: 'הצליל הסוגר', icon: '🔔',
      explain: 'עכשיו מקשיבים דווקא לסוף! תגיד את המילה עד הסוף, ותקשיב לצליל האחרון. וזכור: בסוף מילה יש אותיות עם צורה מיוחדת!',
      demoSpec: { type: 'wordSound', word: 'בָּלוֹן', highlight: 'last' },
      gen: () => qSound(pick(WORDS), 'last')
    },
    {
      id: 10, name: 'מחיאות כף', icon: '👏',
      explain: 'כל מילה אפשר לחלק לחתיכות! מוחאים כף על כל חתיכה: בָּ-נָ-נָה - שלוש מחיאות! תשמע מילה, מחא כפיים ביחד איתה, וספור.',
      demoSpec: { type: 'claps', word: 'בָּנָנָה' },
      gen: () => qClaps(pick(WORDS.filter(W => W.syl)))
    },
    {
      id: 11, name: 'קמץ ופתח', icon: '✨',
      explain: 'האותיות לבד שקטות - הניקוד נותן להן קול! קו קטן מתחת לאות עושה אַה. תשמע צליל כמו בָּה או גָה - ומצא אותו!',
      demoSpec: { type: 'vowelCards', items: [{ L: 'בּ', v: 'kamatz' }, { L: 'ג', v: 'patach' }, { L: 'מ', v: 'kamatz' }] },
      gen: () => qVowelSound(['kamatz', 'patach'], ['chirik', 'cholam', 'shuruk'])
    },
    {
      id: 12, name: 'חיריק', icon: '🌟',
      explain: 'ניקוד חדש: נקודה אחת קטנה מתחת לאות - חיריק! החיריק עושה אִי, כמו בִּי, גִי, מִי!',
      demoSpec: { type: 'vowelCards', items: [{ L: 'בּ', v: 'chirik' }, { L: 'ג', v: 'chirik' }, { L: 'מ', v: 'chirik' }] },
      gen: () => Math.random() < 0.6
        ? qVowelSound(['chirik'], ['kamatz', 'patach', 'cholam'])
        : qVowelSound(['kamatz', 'patach'], ['chirik', 'cholam'])
    },
    {
      id: 13, name: 'חולם', icon: '💫',
      explain: 'עוד ניקוד: האות וו עם נקודה למעלה - חולם! החולם עושה אוֹ, כמו בּוֹ, גוֹ, לוֹ!',
      demoSpec: { type: 'vowelCards', items: [{ L: 'בּ', v: 'cholam' }, { L: 'ג', v: 'cholam' }, { L: 'ל', v: 'cholam' }] },
      gen: () => {
        const r = Math.random();
        if (r < 0.5) return qVowelSound(['cholam'], ['kamatz', 'chirik']);
        if (r < 0.75) return qVowelSound(['chirik'], ['kamatz', 'cholam']);
        return qVowelSound(['kamatz', 'patach'], ['chirik', 'cholam']);
      }
    },
    {
      id: 14, name: 'עוד ניקוד', icon: '🎵',
      explain: 'שלושה סימנים חדשים! סגול - שלוש נקודות מתחת לאות. צירה - שתי נקודות. ושורוק - וו עם נקודה באמצע. תשמע שם של סימן - ומצא אותו!',
      demoSpec: { type: 'vowelCards', items: [{ L: 'בּ', v: 'segol' }, { L: 'בּ', v: 'tsere' }, { L: 'בּ', v: 'shuruk' }], sayName: true },
      gen: () => qVowelName(['segol', 'tsere', 'shuruk'], ['segol', 'tsere', 'shuruk', 'kamatz', 'chirik'])
    },
    {
      id: 15, name: 'קוראים מילים!', icon: '📖',
      explain: 'הרגע הכי גדול - אתה קורא מילה אמיתית! תסתכל על כל אות ועל הניקוד שלה, תגיד את הצלילים לאט, וחבר אותם. דָּ וגם ג - דָּג! ואז מצא את התמונה.',
      demoSpec: { type: 'wordReveal', word: 'דָּג' },
      gen: () => qReadWord(pick(wordsByLen(2)), 3, [2, 3])
    },
    {
      id: 16, name: 'מילים ארוכות יותר', icon: '📚',
      explain: 'עכשיו מילים עם שלוש אותיות! קרא לאט, צליל אחרי צליל, ואז חבר הכול למילה אחת.',
      demoSpec: { type: 'wordReveal', word: 'סֵפֶר' },
      gen: () => qReadWord(pick(wordsByLen(3)), 4, [2, 3])
    },
    {
      id: 17, name: 'מהתמונה למילה', icon: '🖼️',
      explain: 'הפוך על הפוך! רואים תמונה - ומחפשים את המילה הכתובה שלה. קרא את כל המילים לאט. זהירות: יש מילים דומות שמנסות לבלבל!',
      demoSpec: { type: 'wordReveal', word: 'גָּמָל' },
      gen: () => qPickWord(pick([...wordsByLen(2), ...wordsByLen(3)]), 3, [2, 3])
    },
    {
      id: 18, name: 'האות החסרה', icon: '🧩',
      explain: 'אוי לא! המילים מאבדות אותיות! תגיד את המילה לאט, תקשיב איזה צליל מתחבא במקום הריק, ומצא את האות שברחה.',
      demoSpec: { type: 'missingDemo', word: 'כֶּלֶב', idx: 1 },
      gen: () => qMissing(pick([...wordsByLen(3), ...wordsByLen(4)]))
    },
    {
      id: 19, name: 'בונים מילים', icon: '🧱',
      explain: 'עכשיו אתה הבנאי! תשמע מילה, ובנה אותה בעצמך: לחץ על האותיות לפי הסדר, מהצליל הראשון ועד האחרון.',
      demoSpec: { type: 'buildDemo', word: 'דָּג' },
      gen: () => qBuild(pick([...wordsByLen(2), ...wordsByLen(3)]))
    },
    {
      id: 20, name: 'אלוף המילים', icon: '🏆',
      explain: 'האתגר האחרון! מילים גדולות של ארבע אותיות - לפעמים תקרא ותמצא תמונה, ולפעמים תבנה בעצמך. מי שמסיים - יודע לקרוא! אלוף אמיתי!',
      demoSpec: { type: 'buildDemo', word: 'בָּלוֹן' },
      gen: () => Math.random() < 0.5
        ? qBuild(pick(wordsByLen(4)))
        : qReadWord(pick(wordsByLen(4)), 4, [3, 4])
    }
  ];

  return { LEVELS, LETTERS, byChar, WORDS, VOWELS, FINALS, SYL_LETTERS, LOOKALIKE, splitUnits, syllGlyph, syllSpeech };
})();

if (typeof module !== 'undefined') module.exports = LettersLevels;
