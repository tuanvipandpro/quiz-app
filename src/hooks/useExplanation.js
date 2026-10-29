import { useCallback, useEffect, useRef, useState } from 'react';
import { credentials, generateExplanation } from '../services/llm';

// Both quiz modes share request cancellation, credential checks, and error handling.
export function useExplanation(question, uid) {
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const request = useRef(null);
  const close = useCallback(() => {
    request.current?.abort();
    request.current = null;
    setVisible(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    close();
    setSettingsVisible(false);
    setExplanation('');
    setError(null);
    return () => request.current?.abort();
  }, [question, uid, close]);

  const explain = async ({ forceRefresh = false } = {}) => {
    if (!question) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setVisible(true);
    setLoading(true);
    setError(null);
    setExplanation('');
    try {
      const keys = await credentials.getKeys(uid);
      if (controller.signal.aborted) return;
      if (!Object.values(keys).some(Boolean)) {
        setVisible(false);
        setSettingsVisible(true);
        return;
      }
      const result = await generateExplanation(question, {
        uid,
        signal: controller.signal,
        forceRefresh,
      });
      if (!controller.signal.aborted)
        setExplanation(
          `${result.text}\n\n---\n*${result.provider === 'groq' ? 'Groq' : 'Google Gemini'} · ${result.model}${result.cached ? ' · saved explanation' : ''}*`
        );
    } catch (err) {
      if (!controller.signal.aborted)
        setError(err.message || 'Could not generate an explanation. Please retry.');
    } finally {
      if (request.current === controller) setLoading(false);
    }
  };
  return {
    explanation,
    error,
    visible,
    loading,
    explain,
    close,
    settingsVisible,
    setSettingsVisible,
  };
}
