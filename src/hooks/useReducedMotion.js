import { useEffect, useState } from 'react';

export function useReducedMotion() {
  // Start without motion until the preference is known. This also lets Ant Design
  // keep its MotionProvider mounted when the preference changes, preserving forms.
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  return reduced;
}
