/* ═══════════════ הגדרת 20 הרמות של משחק החשבון ═══════════════
 * כל רמה: שם, אייקון (מדבקה), הסבר קולי, דוגמה להסבר, ומחולל תרגילים.
 * המחוללים טהורים (בלי DOM) כדי שאפשר לבדוק אותם ב-node.
 */

const Levels = (() => {

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

  const EMOJIS = [
    { e: '🍎', name: 'תפוחים' },  { e: '🐶', name: 'כלבים' },
    { e: '⭐', name: 'כוכבים' },  { e: '🎈', name: 'בלונים' },
    { e: '🚗', name: 'מכוניות' }, { e: '🐟', name: 'דגים' },
    { e: '🦆', name: 'ברווזים' }, { e: '🍓', name: 'תותים' },
    { e: '⚽', name: 'כדורים' },  { e: '🐸', name: 'צפרדעים' },
    { e: '🦋', name: 'פרפרים' },  { e: '🍪', name: 'עוגיות' },
    { e: '🐥', name: 'אפרוחים' }, { e: '🌸', name: 'פרחים' },
    { e: '🍬', name: 'סוכריות' }, { e: '🐢', name: 'צבים' }
  ];

  const emojiByChar = ch => EMOJIS.find(x => x.e === ch) || { e: ch, name: 'ציורים' };

  /**
   * בניית אפשרויות תשובה: התשובה + מסיחים קרובים והגיוניים.
   * prefer - מסיחים מועדפים (טעויות נפוצות) שינוסו קודם.
   */
  function makeOptions(answer, { count = 4, min = 0, max = Infinity, prefer = [] } = {}) {
    const set = new Set([answer]);
    const tryAdd = v => {
      if (Number.isInteger(v) && v >= min && v <= max && !set.has(v)) set.add(v);
    };
    prefer.forEach(tryAdd);
    let delta = 1;
    let guard = 0;
    while (set.size < count && guard++ < 200) {
      tryAdd(answer + delta);
      tryAdd(answer - delta);
      delta++;
      if (delta > 6) tryAdd(ri(Math.max(min, answer - 9), Math.min(max === Infinity ? answer + 9 : max, answer + 9)));
    }
    return shuffle([...set].slice(0, count));
  }

  /* טקסט הקראה מתוך אסימוני תרגיל, למשל [3,'+',2,'=','?'] ← "כמה זה 3 ועוד 2?" */
  const OP_WORDS = { '+': 'ועוד', '−': 'פחות', '×': 'פעמים', '=': 'שווה' };

  function tokensSpeech(tokens) {
    const last2 = tokens.slice(-2).join('');
    const word = t => (typeof t === 'number' ? String(t) : (t === '?' ? 'כמה' : OP_WORDS[t] || t));
    if (last2 === '=?') {
      return 'כמה זה ' + tokens.slice(0, -2).map(word).join(' ') + '?';
    }
    return tokens.map(word).join(' ') + '?';
  }

  /* ─── בוני תרגילים ─── */

  function qCount(n, emo, optCount = 3) {
    const { e, name } = emojiByChar(emo);
    return {
      kind: 'count',
      prompt: `כמה ${name} יש?`,
      speech: `כמה ${name} יש? ספור אותם, ואז לחץ על המספר הנכון.`,
      hint: 'בוא נספור ביחד! לחץ על הציורים אחד אחד, ותשמע את המספרים.',
      answer: n,
      options: makeOptions(n, { count: optCount, min: 1, max: n + 4 }),
      visual: { type: 'objects', emoji: e, count: n }
    };
  }

  function qCompare(a, b, mode, optCount = 2) {
    const answer = mode === 'big' ? Math.max(a, b) : Math.min(a, b);
    const word = mode === 'big' ? 'הגדול' : 'הקטן';
    return {
      kind: 'compare',
      prompt: `לחץ על המספר ${word} יותר`,
      speech: `לחץ על המספר ${word} יותר. תקשיב טוב: ${word} יותר!`,
      hint: 'ספור את הנקודות מתחת לכל מספר. איפה יש ' + (mode === 'big' ? 'יותר?' : 'פחות?'),
      answer,
      options: shuffle([a, b]),
      compare: { a, b, mode },
      visual: null
    };
  }

  function qAdd(a, b, optCount = 3, withVisual = true) {
    const { e, name } = pick(EMOJIS);
    const tokens = [a, '+', b, '=', '?'];
    return {
      kind: 'expr',
      tokens,
      prompt: '',
      speech: tokensSpeech(tokens),
      hint: withVisual
        ? 'לחץ על כל הציורים אחד אחד, וספור את כולם ביחד.'
        : 'ספור קדימה: תתחיל מהמספר הראשון ותוסיף את השני.',
      answer: a + b,
      options: makeOptions(a + b, { count: optCount, min: 0 }),
      visual: withVisual
        ? { type: 'groups', op: '+', groups: [{ emoji: e, count: a }, { emoji: e, count: b }], name }
        : null
    };
  }

  function qSub(a, b, optCount = 3) {
    const { e, name } = pick(EMOJIS);
    const tokens = [a, '−', b, '=', '?'];
    return {
      kind: 'expr',
      tokens,
      prompt: '',
      speech: tokensSpeech(tokens) + ` היו ${a} ${name}, ו-${b} עפו מהמסך.`,
      hint: 'ספור רק את הציורים שנשארו. בלי אלה שעפו!',
      answer: a - b,
      options: makeOptions(a - b, { count: optCount, min: 0, max: a + 2 }),
      visual: { type: 'sub', emoji: e, total: a, take: b, name }
    };
  }

  function qSeq(start, missIdx, optCount = 4) {
    const nums = [0, 1, 2, 3, 4].map(i => start + i);
    const answer = nums[missIdx];
    const seq = nums.map((n, i) => (i === missIdx ? null : n));
    return {
      kind: 'seq',
      prompt: 'איזה מספר מתחבא?',
      speech: 'המספרים צועדים בסדר, אבל מספר אחד מתחבא! איזה מספר חסר? לחץ עליו.',
      hint: `בוא נגיד ביחד את המספרים לפי הסדר, החל מ-${nums[0]}, ונגלה מי מתחבא.`,
      answer,
      options: makeOptions(answer, { count: optCount, min: 1 }),
      seq,
      visual: null
    };
  }

  function qMissAdd(a, c, optCount = 4) {
    const tokens = [a, '+', '?', '=', c];
    return {
      kind: 'expr',
      tokens,
      prompt: '',
      speech: tokensSpeech(tokens),
      hint: `ספור קדימה מ-${a} עד ${c}. כמה צעדים עשית?`,
      answer: c - a,
      options: makeOptions(c - a, { count: optCount, min: 0, max: c }),
      visual: null
    };
  }

  function qMissSub(a, c, optCount = 4) {
    const tokens = [a, '−', '?', '=', c];
    return {
      kind: 'expr',
      tokens,
      prompt: '',
      speech: tokensSpeech(tokens),
      hint: `ספור אחורה מ-${a} עד ${c}. כמה צעדים עשית?`,
      answer: a - c,
      options: makeOptions(a - c, { count: optCount, min: 0, max: a }),
      visual: null
    };
  }

  function qChain(a, b, c, optCount = 4) {
    const { e } = pick(EMOJIS);
    const tokens = [a, '+', b, '+', c, '=', '?'];
    return {
      kind: 'expr',
      tokens,
      prompt: '',
      speech: tokensSpeech(tokens),
      hint: `קודם חבר את שני הראשונים: ${a} ועוד ${b} זה ${a + b}. עכשיו תוסיף עוד ${c}.`,
      answer: a + b + c,
      options: makeOptions(a + b + c, { count: optCount, min: 0 }),
      visual: {
        type: 'groups', op: '+',
        groups: [{ emoji: e, count: a }, { emoji: e, count: b }, { emoji: e, count: c }]
      }
    };
  }

  function qTens(A, op, B, optCount = 4) {
    const tokens = [A, op, B, '=', '?'];
    const answer = op === '+' ? A + B : A - B;
    return {
      kind: 'expr',
      tokens,
      prompt: '',
      speech: tokensSpeech(tokens),
      hint: `זה כמו ${A / 10} ${OP_WORDS[op]} ${B / 10}, ופשוט מוסיפים אפס לתשובה.`,
      answer,
      options: makeOptions(answer, {
        count: optCount, min: 0, max: 100,
        prefer: [answer + 10, answer - 10, answer + 20]
      }),
      visual: {
        type: 'blocks', op,
        parts: [{ tens: A / 10, units: 0 }, { tens: B / 10, units: 0 }]
      }
    };
  }

  function qTwoDigitSmall(a, op, d, optCount = 4) {
    const tokens = [a, op, d, '=', '?'];
    const answer = op === '+' ? a + d : a - d;
    return {
      kind: 'expr',
      tokens,
      prompt: '',
      speech: tokensSpeech(tokens),
      hint: op === '+'
        ? 'העשרות נשארות אותו הדבר. חבר רק את היחידות הקטנות.'
        : 'העשרות נשארות אותו הדבר. הורד רק מהיחידות הקטנות.',
      answer,
      options: makeOptions(answer, {
        count: optCount, min: 0,
        prefer: [answer + 10, answer - 10, answer + 1, answer - 1]
      }),
      visual: {
        type: 'blocks', op,
        parts: [
          { tens: Math.floor(a / 10), units: a % 10 },
          { tens: Math.floor(d / 10), units: d % 10 }
        ]
      }
    };
  }

  function qGroups(k, n, optCount = 4) {
    const { e, name } = pick(EMOJIS);
    const tokens = [k, '×', n, '=', '?'];
    return {
      kind: 'expr',
      tokens,
      prompt: '',
      speech: `כמה זה ${k} פעמים ${n}? יש ${k} קבוצות, ובכל קבוצה ${n} ${name}. כמה יש בסך הכול?`,
      hint: `ספור את כל ה${name} בכל הקבוצות ביחד, אחד אחד.`,
      answer: k * n,
      options: makeOptions(k * n, {
        count: optCount, min: 0,
        prefer: [k * n + n, k * n - n, k + n]
      }),
      visual: {
        type: 'groups', op: '×',
        groups: Array.from({ length: k }, () => ({ emoji: e, count: n }))
      }
    };
  }

  function qMult(m, n, optCount = 4) {
    const tokens = [m, '×', n, '=', '?'];
    let hint;
    if (m === 2) hint = `שתיים פעמים ${n} זה ${n} ועוד ${n}.`;
    else if (m === 5) hint = 'ספור בקפיצות של חמש: חמש, עשר, חמש עשרה...';
    else hint = `כפול עשר זה קל! פשוט מוסיפים אפס אחרי ה-${n}.`;
    return {
      kind: 'expr',
      tokens,
      prompt: '',
      speech: tokensSpeech(tokens),
      hint,
      answer: m * n,
      options: makeOptions(m * n, {
        count: optCount, min: 0,
        prefer: [m * n + m, m * n - m, m + n]
      }),
      visual: null
    };
  }

  function qBigAdd(a, b, carry, optCount = 4) {
    const tokens = [a, '+', b, '=', '?'];
    const answer = a + b;
    return {
      kind: 'expr',
      tokens,
      prompt: '',
      speech: tokensSpeech(tokens),
      hint: carry
        ? 'חבר קודם את היחידות. יצא יותר מתשע? העשרת החדשה קופצת לעשרות!'
        : 'קודם חבר את היחידות, ואחר כך חבר את העשרות.',
      answer,
      options: makeOptions(answer, {
        count: optCount, min: 0,
        prefer: carry ? [answer - 10, answer + 1, answer - 1] : [answer + 10, answer - 10, answer + 1]
      }),
      visual: {
        type: 'blocks', op: '+',
        parts: [
          { tens: Math.floor(a / 10), units: a % 10 },
          { tens: Math.floor(b / 10), units: b % 10 }
        ]
      }
    };
  }

  /* ─── הגדרות הרמות ─── */

  const LEVELS = [
    {
      id: 1, name: 'ספירה עד 3', icon: '🐥',
      explain: 'היי חבר! בוא נספור ביחד! ספור כמה חיות יש על המסך. אפשר ללחוץ על כל אחת כדי לספור אותה. בסוף - לחץ על המספר הנכון!',
      demo: () => qCount(3, '🐥'),
      gen: () => qCount(ri(1, 3), pick(EMOJIS).e)
    },
    {
      id: 2, name: 'ספירה עד 5', icon: '🍓',
      explain: 'עכשיו סופרים עד חמש! ספור לאט ובזהירות: אחת, שתיים, שלוש, ארבע, חמש.',
      demo: () => qCount(5, '🍓'),
      gen: () => qCount(ri(3, 5), pick(EMOJIS).e)
    },
    {
      id: 3, name: 'ספירה עד 10', icon: '⭐',
      explain: 'וואו, עכשיו סופרים עד עשר! טיפ של אלופים: ספור שורה שורה, זה הרבה יותר קל.',
      demo: () => qCount(8, '⭐'),
      gen: () => qCount(ri(5, 10), pick(EMOJIS).e)
    },
    {
      id: 4, name: 'גדול או קטן?', icon: '🐘',
      explain: 'משחק חדש! רואים שני מספרים. תקשיב טוב למשימה: לפעמים לוחצים על הגדול, ולפעמים דווקא על הקטן! המספר עם יותר נקודות הוא הגדול יותר.',
      demo: () => qCompare(3, 7, 'big'),
      gen: () => {
        const a = ri(1, 10);
        let b = ri(1, 10);
        while (b === a) b = ri(1, 10);
        return qCompare(a, b, pick(['big', 'small']));
      }
    },
    {
      id: 5, name: 'חיבור עד 5', icon: '🦆',
      explain: 'תרגיל חדש: חיבור! סימן הפלוס אומר לשים ביחד. שניים ועוד אחד - סופרים את כולם ביחד - שלושה!',
      demo: () => qAdd(2, 1),
      gen: () => {
        const a = ri(1, 4);
        return qAdd(a, ri(1, 5 - a));
      }
    },
    {
      id: 6, name: 'חיבור עד 10', icon: '🐬',
      explain: 'עכשיו חיבור עם מספרים גדולים יותר, עד עשר! אפשר לעזור לעצמך עם האצבעות, או ללחוץ על הציורים ולספור.',
      demo: () => qAdd(4, 3),
      gen: () => {
        let a, b;
        do { a = ri(1, 9); b = ri(1, 9); } while (a + b < 6 || a + b > 10);
        return qAdd(a, b);
      }
    },
    {
      id: 7, name: 'חיסור עד 5', icon: '🎈',
      explain: 'תרגיל חדש: חיסור! סימן המינוס אומר להוריד. היו ארבעה בלונים, אחד עף לשמיים... נשארו שלושה!',
      demo: () => qSub(4, 1),
      gen: () => {
        const a = ri(2, 5);
        return qSub(a, ri(1, a));
      }
    },
    {
      id: 8, name: 'חיסור עד 10', icon: '🐙',
      explain: 'חיסור עד עשר! תסתכל כמה עפו, וספור רק את אלה שנשארו.',
      demo: () => qSub(9, 3),
      gen: () => {
        const a = ri(6, 10);
        return qSub(a, ri(1, a - 1));
      }
    },
    {
      id: 9, name: 'המספר המתחבא', icon: '🕵️',
      explain: 'משחק בלשים! המספרים צועדים בסדר: שלוש, ארבע, חמש... אבל מספר אחד מתחבא! מצא איזה מספר חסר ולחץ עליו.',
      demo: () => qSeq(3, 2),
      gen: () => qSeq(ri(1, 16), ri(0, 4))
    },
    {
      id: 10, name: 'בלש החיבור', icon: '🔍',
      explain: 'תרגיל בלש אמיתי: שלוש ועוד כמה שווה חמש? ספור קדימה משלוש עד חמש: ארבע, חמש. שני צעדים - התשובה שתיים!',
      demo: () => qMissAdd(3, 5),
      gen: () => {
        const c = ri(4, 10);
        return qMissAdd(ri(1, c - 1), c);
      }
    },
    {
      id: 11, name: 'חיבור עד 20', icon: '🚀',
      explain: 'חיבור ענק, עד עשרים! קח את הזמן, ספור לאט. אתה כבר יודע בדיוק איך עושים את זה.',
      demo: () => qAdd(8, 5, 4),
      gen: () => {
        let a, b;
        do { a = ri(3, 17); b = ri(3, 17); } while (a + b < 11 || a + b > 20);
        return qAdd(a, b, 4);
      }
    },
    {
      id: 12, name: 'חיסור עד 20', icon: '🦖',
      explain: 'חיסור עד עשרים! אתה כבר ממש אלוף. תסתכל כמה נשארו וספור בזהירות.',
      demo: () => qSub(13, 3, 4),
      gen: () => {
        const a = ri(11, 20);
        return qSub(a, ri(2, 9), 4);
      }
    },
    {
      id: 13, name: 'בלש החיסור', icon: '🧩',
      explain: 'בלש החיסור: שמונה פחות כמה שווה חמש? ספור אחורה משמונה עד חמש: שבע, שש, חמש. שלושה צעדים - התשובה שלוש!',
      demo: () => qMissSub(8, 5),
      gen: () => {
        const a = ri(5, 10);
        const ans = ri(1, a - 1);
        return qMissSub(a, a - ans);
      }
    },
    {
      id: 14, name: 'שלושה חברים', icon: '🎪',
      explain: 'עכשיו שלושה מספרים ביחד! קודם חבר את שני הראשונים, ואז הוסף את השלישי. שתיים ועוד שלוש זה חמש, ועוד אחד - שש!',
      demo: () => qChain(2, 3, 1),
      gen: () => {
        let a, b, c;
        do { a = ri(1, 6); b = ri(1, 6); c = ri(1, 6); } while (a + b + c > 15);
        return qChain(a, b, c);
      }
    },
    {
      id: 15, name: 'עשרות', icon: '🏰',
      explain: 'עכשיו משחקים עם עשרות! עשר ועוד עשרים זה בדיוק כמו אחת ועוד שתיים - רק שמוסיפים אפס בסוף. שלושים!',
      demo: () => qTens(10, '+', 20),
      gen: () => {
        if (Math.random() < 0.5) {
          const A = 10 * ri(1, 8);
          return qTens(A, '+', 10 * ri(1, Math.min(9, (100 - A) / 10)));
        }
        const A = 10 * ri(3, 9);
        return qTens(A, '−', 10 * ri(1, A / 10 - 1));
      }
    },
    {
      id: 16, name: 'גדול ועוד קטן', icon: '🦒',
      explain: 'מספר גדול ועוד מספר קטן! העשרות נשארות אותו הדבר, ומחברים רק את היחידות. עשרים ושלוש ועוד ארבע - עשרים ושבע!',
      demo: () => qTwoDigitSmall(23, '+', 4),
      gen: () => {
        const t = ri(1, 8);
        if (Math.random() < 0.5) {
          const u = ri(1, 8);
          return qTwoDigitSmall(10 * t + u, '+', ri(1, 9 - u));
        }
        const u = ri(2, 9);
        return qTwoDigitSmall(10 * t + u, '−', ri(1, u - 1));
      }
    },
    {
      id: 17, name: 'קבוצות שוות', icon: '🍬',
      explain: 'קבוצות שוות! שלוש קבוצות, ובכל אחת שתי סוכריות. סימן הכפל אומר: כמה פעמים לוקחים את אותו המספר. ספור את כולן - שש!',
      demo: () => qGroups(3, 2),
      gen: () => {
        let k, n;
        do { k = ri(2, 4); n = ri(2, 5); } while (k * n > 20);
        return qGroups(k, n);
      }
    },
    {
      id: 18, name: 'כפל ראשון', icon: '🧙',
      explain: 'כפל אמיתי, כמו הגדולים! שתיים כפול ארבע זה ארבע ועוד ארבע - שמונה! נתאמן על כפל בשתיים, בחמש ובעשר.',
      demo: () => qMult(2, 4),
      gen: () => qMult(pick([2, 5, 10]), ri(2, 9))
    },
    {
      id: 19, name: 'חיבור ענק', icon: '🐳',
      explain: 'חיבור של שני מספרים ענקיים! הסוד: קודם מחברים את היחידות הקטנות, ואחר כך את העשרות הגדולות.',
      demo: () => qBigAdd(23, 14, false),
      gen: () => {
        const t1 = ri(1, 5), t2 = ri(1, Math.min(4, 8 - t1));
        const u1 = ri(1, 8), u2 = ri(0, 9 - u1);
        return qBigAdd(10 * t1 + u1, 10 * t2 + u2, false);
      }
    },
    {
      id: 20, name: 'אלוף החשבון', icon: '🏆',
      explain: 'האתגר הכי גדול שיש! כשמחברים את היחידות ויוצא יותר מתשע - עשרת חדשה קופצת אל העשרות. מי שפותר את זה הוא אלוף חשבון אמיתי!',
      demo: () => qBigAdd(17, 8, true),
      gen: () => {
        const t1 = ri(1, 2), u1 = ri(4, 9);
        const u2 = ri(10 - u1, 9), bt = ri(0, 1);
        return qBigAdd(10 * t1 + u1, 10 * bt + u2, true);
      }
    }
  ];

  return { LEVELS, tokensSpeech, makeOptions };
})();

if (typeof module !== 'undefined') module.exports = Levels;
