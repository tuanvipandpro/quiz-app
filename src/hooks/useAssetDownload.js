import { useEffect, useRef, useState } from 'react';
import { downloadAsset } from '../services/assetDownload';

export function useAssetDownload() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const active = useRef(null);
  useEffect(() => () => active.current?.abort(), []);
  const download = async (url, filename) => {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setFailed(false);
    try {
      await downloadAsset(url, filename, controller.signal);
    } catch {
      if (!controller.signal.aborted) setFailed(true);
    } finally {
      if (!controller.signal.aborted) {
        active.current = null;
        setBusy(false);
      }
    }
  };
  return { busy, failed, download };
}
