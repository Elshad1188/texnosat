import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type HomeMode = "transport" | "real_estate" | "general";

const STORAGE_KEY = "elan24_home_mode";

interface HomeModeCtx {
  mode: HomeMode | null;
  setMode: (m: HomeMode | null) => void;
}

const Ctx = createContext<HomeModeCtx>({ mode: null, setMode: () => {} });

export const HomeModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<HomeMode | null>(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === "transport" || v === "real_estate" || v === "general" ? v : null;
    } catch {
      return null;
    }
  });

  const setMode = (m: HomeMode | null) => {
    setModeState(m);
    try {
      if (m) localStorage.setItem(STORAGE_KEY, m);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return <Ctx.Provider value={{ mode, setMode }}>{children}</Ctx.Provider>;
};

export const useHomeMode = () => useContext(Ctx);
