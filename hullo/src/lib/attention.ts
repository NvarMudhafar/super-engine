/**
 * Puts an unread count in the tab title while the tab is in the background,
 * so a reply or a new match isn't missed. Cleared as soon as you look.
 */
const BASE = 'hullo — talk to someone new';
let unread = 0;

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      unread = 0;
      document.title = BASE;
    }
  });
}

export const attention = {
  poke(label: string) {
    if (!document.hidden) return;
    unread++;
    document.title = `(${unread}) ${label} · hullo`;
  },
};
