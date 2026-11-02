import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';

const WHEEL_THRESHOLD_PX = 40;
const WHEEL_GESTURE_GAP_MS = 180;
const SECTION_SETTLE_MS = 800;

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

  useEffect(() => {
    const panels = [...rootRef.current.querySelectorAll('.landing-panel')];
    let locked = false;
    let accumulated = 0;
    let lastInput = 0;
    let timer;
    const release = () => {
      locked = false;
      accumulated = 0;
      clearTimeout(timer);
    };
    const interrupt = () => {
      if (locked) window.scrollTo({ top: window.scrollY, behavior: 'instant' });
      release();
    };
    const wheel = (event) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey ||
        !event.deltaY ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
      )
        return;
      const target = event.target instanceof Element ? event.target : null;
      if (
        target?.closest(
          'input, textarea, select, [contenteditable], [role="dialog"], .ant-modal-root, .ant-dropdown, .ant-select-dropdown'
        )
      )
        return;
      for (
        let element = target;
        element && element !== document.body;
        element = element.parentElement
      ) {
        if (
          /(auto|scroll)/.test(getComputedStyle(element).overflowY) &&
          element.scrollHeight > element.clientHeight + 1
        )
          return;
      }
      if (locked) {
        event.preventDefault();
        return;
      }
      const header = document.querySelector('.app-header').getBoundingClientRect().height;
      const rectangles = panels.map((panel) => panel.getBoundingClientRect());
      const visible = rectangles.map((rect) =>
        Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, header))
      );
      const index = visible.indexOf(Math.max(...visible));
      const direction = Math.sign(event.deltaY);
      const rect = rectangles[index];
      const remaining = direction > 0 ? rect.bottom - innerHeight : header - rect.top;
      // Long panels retain natural scrolling until their content edge is reached.
      if (rect.height > innerHeight - header + 2 && remaining > 2) {
        accumulated = 0;
        return;
      }
      const next = index + direction;
      if (next < 0 || next >= panels.length) return;
      event.preventDefault();
      if (
        event.timeStamp - lastInput > WHEEL_GESTURE_GAP_MS ||
        Math.sign(accumulated) !== direction
      )
        accumulated = 0;
      lastInput = event.timeStamp;
      accumulated +=
        event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      if (Math.abs(accumulated) < WHEEL_THRESHOLD_PX) return;
      locked = true;
      panels[next].scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
      if (!window.IntersectionObserver) setState((previous) => ({ ...previous, active: next }));
      timer = setTimeout(release, reducedMotion ? WHEEL_GESTURE_GAP_MS : SECTION_SETTLE_MS);
    };
    document.addEventListener('wheel', wheel, { passive: false });
    document.addEventListener('keydown', interrupt);
    document.addEventListener('pointerdown', interrupt);
    return () => {
      release();
      document.removeEventListener('wheel', wheel);
      document.removeEventListener('keydown', interrupt);
      document.removeEventListener('pointerdown', interrupt);
    };
  }, [reducedMotion]);

  const goToSection = (index) => {
    setState((previous) => ({ ...previous, active: index }));
    const panel = rootRef.current?.querySelectorAll('.landing-panel')[index];
    panel?.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
    panel?.querySelector('h1, h2')?.focus({ preventScroll: true });
  };
  return { rootRef, ...state, reducedMotion, goToSection };
}
