/* קונפטי ואנימציות חגיגה קטנות */
const Confetti = (() => {
  const COLORS = ['#ff4d94', '#ffd23f', '#7c4dff', '#34c759', '#ff8a3d', '#00c2a8', '#4d9dff'];

  function bit(x, y, spread, upward) {
    const el = document.createElement('div');
    el.className = 'confetti-bit';
    el.style.background = COLORS[Math.floor(Math.random() * COLORS.length)];
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    if (Math.random() < 0.4) el.style.borderRadius = '50%';
    document.body.appendChild(el);

    const dx = (Math.random() - 0.5) * spread;
    const dy = upward
      ? -(60 + Math.random() * 180)
      : (window.innerHeight - y) + 60;
    const rot = (Math.random() - 0.5) * 720;
    const dur = upward ? 900 + Math.random() * 500 : 1600 + Math.random() * 1400;

    const anim = el.animate([
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: upward ? 0 : 0.9 }
    ], { duration: dur, easing: upward ? 'cubic-bezier(0.2,0.8,0.4,1)' : 'ease-in' });

    anim.onfinish = () => el.remove();
  }

  return {
    /* התפרצות קטנה מנקודה (למשל מכפתור התשובה הנכונה) */
    burst(x, y, n = 18) {
      for (let i = 0; i < n; i++) bit(x, y, 260, true);
    },

    /* גשם קונפטי על כל המסך (עליית רמה) */
    rain(n = 70) {
      for (let i = 0; i < n; i++) {
        setTimeout(() => bit(Math.random() * window.innerWidth, -20, 120, false), i * 22);
      }
    },

    /* כוכב שעף מכפתור התשובה אל מד הכוכבים */
    flyStar(fromRect, toRect, onArrive) {
      const el = document.createElement('div');
      el.className = 'fly-star';
      el.textContent = '⭐';
      el.style.left = (fromRect.left + fromRect.width / 2 - 15) + 'px';
      el.style.top = (fromRect.top + fromRect.height / 2 - 15) + 'px';
      document.body.appendChild(el);

      const dx = (toRect.left + toRect.width / 2) - (fromRect.left + fromRect.width / 2);
      const dy = (toRect.top + toRect.height / 2) - (fromRect.top + fromRect.height / 2);

      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transform = `translate(${dx}px, ${dy}px) scale(0.6) rotate(200deg)`;
      }));

      setTimeout(() => {
        el.remove();
        if (onArrive) onArrive();
      }, 820);
    }
  };
})();

if (typeof module !== 'undefined') module.exports = Confetti;
