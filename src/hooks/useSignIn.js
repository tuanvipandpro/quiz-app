import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';

// All sign-in entry points share the same dialog state and error handling.
export function useSignIn({ onSuccess } = {}) {
  const { signInWithGoogle } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const mounted = useRef(false);
  const pending = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const close = () => {
    setOpen(false);
    setError(null);
  };
  const submit = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await signInWithGoogle();
      if (!mounted.current) return;
      if (result.success) {
        close();
        onSuccess?.(result.user);
      } else setError('Could not sign in. Please retry.');
    } catch {
      if (mounted.current) setError('Could not sign in. Please retry.');
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return {
    show: () => {
      setError(null);
      setOpen(true);
    },
    modalProps: { open, busy, error, onClose: close, onSignIn: submit },
  };
}
