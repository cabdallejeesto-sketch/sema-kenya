import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { loadProgress, reducer, saveProgress, type Action, type Progress } from '../engine/progress';
import { loadVoice, type VoiceInfo } from '../engine/speech';
import { translate, type UIKey } from '../i18n';

interface Store {
  p: Progress;
  dispatch: (a: Action) => void;
  t: (key: UIKey, vars?: Record<string, string | number>) => string;
  voice: VoiceInfo;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [p, dispatch] = useReducer(reducer, undefined, () => loadProgress());
  const [voice, setVoice] = useState<VoiceInfo>({ available: false, name: null, lang: null });

  useEffect(() => saveProgress(p), [p]);
  useEffect(() => {
    loadVoice().then(setVoice);
  }, []);
  useEffect(() => {
    document.documentElement.lang = p.lang === 'so' ? 'so' : 'en';
  }, [p.lang]);

  const value = useMemo<Store>(
    () => ({ p, dispatch, voice, t: (key, vars) => translate(p.lang, key, vars) }),
    [p, voice],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}
