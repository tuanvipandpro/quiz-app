import { useCallback, useEffect, useRef, useState } from 'react';
import { parseRoute } from '../utils/navigation';

const POSITION = 'quizRoutePosition';
const HASH = 'quizRouteHash';

export function useHashRoute(guard, nativeGuard) {
  const [hash, setHash] = useState(() => window.location.hash || '#/library');
  const current = useRef(hash);
  const position = useRef(window.history.state?.[POSITION] ?? 0);
  const restoring = useRef(false);
  const guardRef = useRef({ guard, nativeGuard });
  guardRef.current = { guard, nativeGuard };
  const accept = useCallback((next, nextPosition) => {
    current.current = next;
    position.current = nextPosition;
    setHash(next);
  }, []);
  const commit = useCallback(
    (next, replace = false) => {
      const nextPosition = position.current + (replace ? 0 : 1);
      window.history[replace ? 'replaceState' : 'pushState'](
        { [POSITION]: nextPosition, [HASH]: next },
        '',
        next
      );
      accept(next, nextPosition);
    },
    [accept]
  );
  const navigate = useCallback(
    (next, bypass = false) => {
      if (next === current.current || restoring.current) return;
      if (!bypass && guardRef.current.guard?.(() => commit(next))) return;
      commit(next);
    },
    [commit]
  );

  useEffect(() => {
    window.history.replaceState(
      { ...window.history.state, [POSITION]: position.current, [HASH]: current.current },
      '',
      current.current
    );
    const mayLeave = () =>
      !guardRef.current.nativeGuard?.active || window.confirm(guardRef.current.nativeGuard.message);
    const changed = (event) => {
      const entry = event.state || window.history.state;
      const next = entry?.[HASH] || window.location.hash || '#/library';
      const targetPosition = Number.isInteger(entry?.[POSITION])
        ? entry[POSITION]
        : position.current - 1;
      if (restoring.current) {
        restoring.current = false;
        return;
      }
      if (next === current.current) return;
      // A synchronous browser prompt keeps native history events ordered while asking.
      if (!mayLeave()) {
        restoring.current = true;
        window.history.go(position.current - targetPosition);
        return;
      }
      accept(next, targetPosition);
    };
    const hashChanged = () => {
      const next = window.location.hash || '#/library';
      if (window.history.state?.[HASH] === next || next === current.current || restoring.current)
        return;
      if (!mayLeave()) {
        restoring.current = true;
        window.history.back();
        return;
      }
      const nextPosition = position.current + 1;
      window.history.replaceState({ [POSITION]: nextPosition, [HASH]: next }, '', next);
      accept(next, nextPosition);
    };
    window.addEventListener('popstate', changed);
    window.addEventListener('hashchange', hashChanged);
    return () => {
      window.removeEventListener('popstate', changed);
      window.removeEventListener('hashchange', hashChanged);
    };
  }, [accept]);
  return { hash, route: parseRoute(hash), navigate, replace: (next) => commit(next, true) };
}
