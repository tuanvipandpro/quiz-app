import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

export function useLandingSections() {
  const rootRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const [state, setState] = useState({ active: 0, seen: [0], ready: false });

  useEffect(() => {
    const root = rootRef.current;
    const panels = [...root.querySelectorAll('.landing-panel')];
    document.documentElement.classList.add('landing-scroll');
    if (!window.IntersectionObserver)
      return () => document.documentElement.classList.remove('landing-scroll');
    const ratios = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        const newlySeen = [];
        for (const entry of entries) {
          const index = panels.indexOf(entry.target);
          ratios.set(index, entry.intersectionRatio);
          if (entry.isIntersecting && entry.intersectionRatio > 0.1) newlySeen.push(index);
        }
        const best = [...ratios].sort((a, b) => b[1] - a[1])[0];
        setState((previous) => {
          const active = best?.[1] > 0 ? best[0] : previous.active;
          const seen = [...new Set([...previous.seen, ...newlySeen])];
          if (previous.ready && active === previous.active && seen.length === previous.seen.length)
            return previous;
          return { active, seen, ready: true };
        });
      },
      { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    );
    panels.forEach((panel) => observer.observe(panel));
    return () => {
      observer.disconnect();
      document.documentElement.classList.remove('landing-scroll');
    };
  }, []);

  const goToSection = (index) => {
    setState((previous) => ({ ...previous, active: index }));
    const panel = rootRef.current?.querySelectorAll('.landing-panel')[index];
    panel?.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
    panel?.querySelector('h1, h2')?.focus({ preventScroll: true });
  };
  return { rootRef, ...state, reducedMotion, goToSection };
}
