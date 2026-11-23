/** Per-browser conveniences. Nothing here is needed for the app to work. */
export interface Prefs {
  interests: string[];
  fallback: boolean;
  /** Blur each new stranger's video until you choose to reveal it. */
  blurVideo: boolean;
  /** Relay video through TURN so strangers never see your IP (when the server offers it). */
  relayOnly: boolean;
  theme: 'light' | 'dark' | null;
  agreed: boolean;
}

const KEY = 'hullo/prefs/v1';

const DEFAULTS: Prefs = {
  interests: [],
  fallback: true,
  blurVideo: true,
  relayOnly: true,
  theme: null,
  agreed: false,
};

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      interests: Array.isArray(parsed.interests) ? parsed.interests.filter((i) => typeof i === 'string') : [],
      fallback: parsed.fallback ?? DEFAULTS.fallback,
      blurVideo: parsed.blurVideo ?? DEFAULTS.blurVideo,
      relayOnly: parsed.relayOnly ?? DEFAULTS.relayOnly,
      theme: parsed.theme === 'light' || parsed.theme === 'dark' ? parsed.theme : null,
      agreed: parsed.agreed === true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrefs(prefs: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Private mode or storage disabled — preferences just won't stick.
  }
}

export function applyTheme(theme: Prefs['theme']) {
  if (theme) document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}
