import { useCallback, useEffect, useRef, useState } from 'react';
import { credentials, generateExplanation } from '../services/llm';
import appAiService from '../services/appAiService';
import { useAiSource } from './useAiSource';
import { useLanguage } from '../contexts/LanguageContext';
import { AI_LABELS } from '../services/llm/modelRegistry';

// Both quiz modes share request cancellation, credential checks, and error handling.
export function useExplanation(question, uid) {
  const { source, setSource } = useAiSource(uid);
  const { t } = useLanguage();
  const [usage, setUsage] = useState(null);
  const attempt = useRef(null);
  const [completion, setCompletion] = useState(null);
  const explanation = completion
    ? `${completion.text}\n\n---\n*${AI_LABELS[completion.provider] || completion.provider} · ${completion.model}${completion.cached ? ' · ' + t('Saved explanation') : ''}*`
    : '';
  const [error, setError] = useState(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const request = useRef(null);
  const triggerRef = useRef(null);
  const close = useCallback(() => {
    request.current?.abort();
    request.current = null;
    setVisible(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    close();
    setSettingsVisible(false);
    setCompletion(null);
    setError(null);
    setUsage(null);
    attempt.current = null;
    return () => request.current?.abort();
  }, [question, uid, close]);
  useEffect(() => {
    close();
    setCompletion(null);
    setError(null);
    setUsage(null);
    attempt.current = null;
  }, [source, close]);

  const explain = async ({ forceRefresh = false } = {}) => {
    if (!question) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setVisible(true);
    setLoading(true);
    setError(null);
    setCompletion(null);
    try {
      let result;
      if (source === 'app' && uid) {
        if (!attempt.current || forceRefresh) {
          const quota = await appAiService.usage(uid, controller.signal);
          if (controller.signal.aborted) return;
          setUsage(quota);
          attempt.current = `${new Date(quota.serverTime).toISOString().slice(0, 10)}:${crypto.randomUUID()}`;
        }
        result = await appAiService.generate(question, {
          uid,
          requestId: attempt.current,
          signal: controller.signal,
          forceRefresh,
        });
      } else {
        const keys = await credentials.getKeys(uid);
        if (controller.signal.aborted) return;
        if (!Object.values(keys).some(Boolean)) {
          setVisible(false);
          setSettingsVisible(true);
          return;
        }
        result = await generateExplanation(question, {
          uid,
          signal: controller.signal,
          forceRefresh,
        });
      }
      if (!controller.signal.aborted) {
        if (result.usage) setUsage(result.usage);
        setCompletion(result);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        if (err.usage) setUsage(err.usage);
        setError(err.message || 'Could not generate an explanation. Please retry.');
      }
    } finally {
      if (request.current === controller) setLoading(false);
    }
  };
  return {
    triggerRef,
    source,
    setSource,
    usage,
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
