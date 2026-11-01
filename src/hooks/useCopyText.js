import { useEffect, useRef, useState } from 'react';

export function useCopyText() {
  const [result, setResult] = useState(null);
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current += 1;
    },
    []
  );
  const copy = async (key, value) => {
    const current = ++request.current;
    setResult(null);
    try {
      await navigator.clipboard.writeText(value);
      if (request.current === current) setResult({ key, success: true });
    } catch {
      if (request.current === current) setResult({ key, success: false });
    }
  };
  return { result, copy };
}
