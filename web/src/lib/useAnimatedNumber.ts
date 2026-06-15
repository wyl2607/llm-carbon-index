import { useEffect, useState } from 'react';

/**
 * Lightweight CSS-free number count-up animation (no new deps).
 * Duration in ms, eases toward target.
 */
export function useAnimatedNumber(target: number, duration = 600): number {
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    const start = display;
    const diff = target - start;
    if (Math.abs(diff) < 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplay(target);
      return;
    }

    const startTime = Date.now();
    let raf: number;

    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutQuad
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = Math.round(start + diff * eased);
      setDisplay(current);

      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        setDisplay(target);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return display;
}
