/**
 * Puts an unread count in the tab title while the tab is in the background,
 * so a reply or a new match isn't missed. Cleared as soon as you look.
 */
export interface TitleWords {
  base: string;
  stranger: string;
  message: string;
}

let words: TitleWords = { base: 'hala', stranger: 'New stranger', message: 'New message' };
let unread = 0;

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      unread = 0;
      document.title = words.base;
    }
  });
}

export const attention = {
  /** Called when the language changes. */
  setWords(next: TitleWords) {
    words = next;
    if (!unread) document.title = next.base;
  },
  poke(what: 'stranger' | 'message') {
    if (!document.hidden) return;
    unread++;
    document.title = `(${unread}) ${words[what]} · ${words.base.split(' — ')[0]}`;
  },
};
