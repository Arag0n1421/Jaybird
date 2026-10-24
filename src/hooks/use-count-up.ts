import { useEffect, useRef, useState } from "react";

/** Animates from the previous value to target. Instant under reduced motion. */
export function useCountUp(target: number, ms = 1200) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(target);
      from.current = target;
      return;
    }
    let raf = 0;
    const start = performance.now();
    const a = from.current;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const val = Math.round(a + (target - a) * (1 - Math.pow(1 - p, 3)));
      setV(val);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}
