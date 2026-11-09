import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { isLanguage, type Language } from "../i18n";

export type Theme = "system" | "light" | "dark";

export interface Settings {
  language: Language;
  languageChosen: boolean;
  theme: Theme;
  reducedMotion: boolean;
  dataSaver: boolean;
  setLanguage: (l: Language) => void;
  setTheme: (t: Theme) => void;
  setReducedMotion: (v: boolean) => void;
  setDataSaver: (v: boolean) => void;
}

/** Storage that never throws (private mode, blocked storage, previews). Holds preferences only, never personal data. */
const safeStorage = createJSONStorage(() => ({
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
}));

function initialLanguage(): Language {
  const nav = typeof navigator !== "undefined" ? navigator.language.slice(0, 2) : "ar";
  return isLanguage(nav) ? nav : "ar";
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      language: initialLanguage(),
      languageChosen: false,
      theme: "system",
      reducedMotion: false,
      dataSaver: false,
      setLanguage: (language) => set({ language, languageChosen: true }),
      setTheme: (theme) => set({ theme }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setDataSaver: (dataSaver) => set({ dataSaver }),
    }),
    {
      name: "ashmont.settings.v1",
      storage: safeStorage,
      version: 1,
      partialize: ({ language, languageChosen, theme, reducedMotion, dataSaver }) => ({ language, languageChosen, theme, reducedMotion, dataSaver }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Settings>;
        return {
          ...current,
          language: isLanguage(p.language) ? p.language : current.language,
          languageChosen: p.languageChosen === true,
          theme: p.theme === "light" || p.theme === "dark" || p.theme === "system" ? p.theme : "system",
          reducedMotion: p.reducedMotion === true,
          dataSaver: p.dataSaver === true,
        };
      },
    },
  ),
);

export const CACHE_PREFIX = "ashmont.cache.";

/** Clear cached content (articles, media metadata). Preferences are kept. */
export async function clearContentCache(): Promise<void> {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(CACHE_PREFIX)) localStorage.removeItem(k);
  } catch { /* ignore */ }
  if (typeof caches !== "undefined") {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
}
